"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { reviewAt } from "@/lib/object-tracking";
import type { VideoAnalysisOutput } from "@/lib/video-analysis";

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 15000);
}

export function ObjectReview({ output, videoSrc, file }: {
  output: VideoAnalysisOutput; videoSrc: string; file: File;
}) {
  const frames = useMemo(() => output.objectFrames ?? [], [output.objectFrames]);
  const first = frames[0]?.timestampMs ?? 0;
  const last = frames.at(-1)?.timestampMs ?? first;
  const [time, setTime] = useState(first);
  const [smooth, setSmooth] = useState(false);
  const [tentative, setTentative] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exportError, setExportError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const exportController = useRef<AbortController | null>(null);
  const observed = useMemo(() => frames.filter((frame) => frame.timestampMs <= time).at(-1), [frames, time]);
  // No stale overlays past the last sampled interval or across a long gap.
  const current = smooth ? reviewAt(frames, time) : {
    timestampMs: time, interpolated: false,
    objects: observed && time - observed.timestampMs <= 100 ? observed.objects : [],
  };
  const visible = current.objects.filter((o) => o.confirmed || tentative);
  const counts = useMemo(() => (["ball", "bat"] as const).map((kind) => ({
    kind, observations: frames.reduce((n, frame) => n + frame.objects.filter((o) => o.kind === kind && o.confirmed).length, 0),
    tracks: new Set(frames.flatMap((frame) => frame.objects.filter((o) => o.kind === kind && o.confirmed).map((o) => o.trackId))).size,
  })), [frames]);
  const aspect = output.sourceWidth / output.sourceHeight;

  useEffect(() => () => exportController.current?.abort(), []);
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playing || !video.requestVideoFrameCallback) return;
    let id = 0, stopped = false;
    const tick = (_now: number, metadata: VideoFrameCallbackMetadata) => {
      if (stopped) return;
      setTime(metadata.mediaTime * 1000);
      id = video.requestVideoFrameCallback(tick);
    };
    id = video.requestVideoFrameCallback(tick);
    return () => { stopped = true; video.cancelVideoFrameCallback(id); };
  }, [playing]);

  function seek(timestampMs: number) {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    const next = Math.max(first, Math.min(last, timestampMs));
    setTime(next);
    video.currentTime = next / 1000;
  }
  function step(direction: number) {
    if (smooth) { seek(time + direction * 1000 / 120); return; }
    const next = direction > 0 ? frames.find((frame) => frame.timestampMs > time + 0.1)
      : frames.filter((frame) => frame.timestampMs < time - 0.1).at(-1);
    if (next) seek(next.timestampMs);
  }
  async function exportVideo() {
    if (exportController.current) return;
    const controller = new AbortController();
    exportController.current = controller;
    setExportProgress(0); setExportError("");
    try {
      const { export120Review } = await import("@/lib/export-review");
      const start = Math.max(0, Math.min(time / 1000, output.durationMs / 1000 - 0.1));
      const blob = await export120Review(file, start, Math.min(4, output.durationMs / 1000 - start),
        controller.signal, setExportProgress);
      download(blob, "swinglens-120fps-blended-review.mp4");
    } catch (error) {
      setExportError(controller.signal.aborted ? "Export cancelled." : error instanceof Error ? error.message : "Export failed.");
    } finally {
      exportController.current = null;
      setExportProgress(null);
    }
  }
  function exportData() {
    download(new Blob([JSON.stringify({
      schema: "swinglens-tracks-v1", coordinates: "normalized-image", timestampMode: output.timestampMode,
      model: "EfficientDet Lite0 v1", ballClass: "sports ball (not baseball-specific)",
      localization: "photometric weighted center inside neural boxes; not a learned heatmap",
      calibrated: false, frames,
    }, null, 2)], { type: "application/json" }), "swinglens-observed-tracks.json");
  }

  return (
    <section className="object-review no-print" aria-labelledby="object-review-title">
      <div className="object-review-head">
        <div><p className="eyebrow light"><span /> BAT + BALL LAB</p>
          <h2 id="object-review-title">Follow the object.<br />Inspect the evidence.</h2>
          <p>Local neural detection + online association. A detection is not ground truth; inspect every track.</p>
        </div>
        <div className="object-counts">
          {counts.map((count) => <div key={count.kind} className={count.kind}>
            <span>{count.kind.toUpperCase()}</span><strong>{count.observations}</strong>
            <small>{count.tracks ? `${count.tracks} confirmed track ID(s)` : "No confirmed track"}</small>
          </div>)}
        </div>
      </div>
      {output.objectError && <p className="error-box" role="alert">Object tracking incomplete: {output.objectError}</p>}
      <div className="object-video" style={{ aspectRatio: aspect }}>
        <video ref={videoRef} src={videoSrc} playsInline controls preload="auto"
          onLoadedMetadata={() => { if (videoRef.current) videoRef.current.currentTime = first / 1000; }}
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
          onSeeking={() => setSeeking(true)} onSeeked={() => setSeeking(false)}
          onTimeUpdate={(event) => { if (!event.currentTarget.requestVideoFrameCallback && playing) setTime(event.currentTarget.currentTime * 1000); }} />
        {!seeking && <svg viewBox={`0 0 ${aspect} 1`} aria-label="Bat and ball tracking overlay">
          {visible.map((object) => {
            const points: string[] = [];
            // Stop trails at missing observations; never bridge occlusion.
            for (let i = frames.length - 1; i >= 0; i--) {
              const frame = frames[i];
              if (frame.timestampMs > time) continue;
              if (time - frame.timestampMs > 400) break;
              const match = frame.objects.find((o) => o.trackId === object.trackId && o.confirmed);
              if (!match) break;
              points.unshift(`${match.x * aspect},${match.y}`);
            }
            const color = object.kind === "ball" ? "#d9ff50" : "#ff966d";
            return <g key={object.trackId} stroke={color} fill="none" strokeWidth=".006" opacity={object.confirmed ? 1 : .45}>
              <polyline points={points.join(" ")} strokeWidth=".004" opacity=".65" />
              <rect x={object.box.x * aspect} y={object.box.y} width={object.box.width * aspect} height={object.box.height}
                strokeDasharray={current.interpolated || !object.confirmed ? ".015 .01" : undefined} />
              <circle cx={object.x * aspect} cy={object.y} r=".009" />
              <text x={object.box.x * aspect} y={Math.max(.03, object.box.y - .014)}
                fill={color} stroke="none" fontSize=".03">
                {object.kind.toUpperCase()} #{object.trackId} · {Math.round(object.score * 100)}%
              </text>
            </g>;
          })}
        </svg>}
      </div>
      <div className="object-timeline">
        <button onClick={() => step(-1)} aria-label="Previous object frame">←</button>
        <input aria-label="Object timeline" type="range" min={first} max={last || 1}
          step={smooth ? 1000 / 120 : 1} value={Math.max(first, Math.min(last, time))} onChange={(e) => seek(Number(e.target.value))} />
        <button onClick={() => step(1)} aria-label="Next object frame">→</button>
        <output>{(time / 1000).toFixed(3)}s</output>
      </div>
      <div className="object-tools">
        <label><input type="checkbox" checked={smooth} onChange={(e) => setSmooth(e.target.checked)} /> 120 Hz trajectory interpolation</label>
        <label><input type="checkbox" checked={tentative} onChange={(e) => setTentative(e.target.checked)} /> Show tentative candidates</label>
        <label>Playback <select aria-label="Object playback speed" defaultValue="0.25" onChange={(e) => {
          if (videoRef.current) videoRef.current.playbackRate = Number(e.target.value);
        }}><option value="0.1">0.1×</option><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1">1×</option></select></label>
      </div>
      <p className="object-evidence">
        {current.interpolated ? "INTERPOLATED COORDINATES — not a measured position." : "OBSERVED SAMPLES — original video, model-estimated positions."}
        {" "}Source {output.sourceFps.toFixed(1)} fps · analyzed {output.effectiveSampleFps?.toFixed(1) ?? "—"} samples/s · {frames.length} samples
        {" "}({output.timestampMode === "decoded-pts" ? "decoded timestamps" : "estimated seek timestamps"}).
        {" "}Covered {(first / 1000).toFixed(2)}–{(last / 1000).toFixed(2)}s; no overlays outside tracked coverage.
      </p>
      <div className="object-export">
        <button onClick={exportData} disabled={!frames.length}>Download observed tracks</button>
        <button onClick={() => void exportVideo()} disabled={exportProgress !== null || !frames.length}>
          {exportProgress !== null ? `Encoding locally · ${exportProgress}%` : "Export 120 fps review"}
        </button>
        {exportProgress !== null && <button onClick={() => exportController.current?.abort()}>Cancel export</button>}
      </div>
      {exportError && <p role="status">{exportError}</p>}
      <p className="object-limits">Export: up to 4 seconds from the current position, 720px maximum edge, no audio.
        Frame blending is watermarked and may ghost fast objects. It does not recover missing motion.
        Bat boxes do not locate the barrel tip; sports-ball detections are not baseball-specific.
        No physical speed or confirmed contact is inferred.</p>
    </section>
  );
}
