"use client";

import { useMemo, useState } from "react";
import { renderExportStill } from "@/lib/export-still";
import type { PhaseResult, PoseFrame } from "@/lib/types";
import { Icon } from "./Icon";
import { SkeletonView } from "./SkeletonView";

export function ReviewStudio({
  frames,
  phases,
  aspectRatio = 1,
  videoSrc,
  sourceWidth,
  sourceHeight,
}: {
  frames: PoseFrame[];
  phases: PhaseResult[];
  aspectRatio?: number;
  videoSrc?: string | null;
  sourceWidth?: number;
  sourceHeight?: number;
}) {
  const defaultIndex = Math.max(0, frames.findIndex((frame) => frame === phases.find((phase) => phase.key === "impact")?.frame));
  const [frameIndex, setFrameIndex] = useState(defaultIndex);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [compare, setCompare] = useState(false);
  const [compareIndex, setCompareIndex] = useState(2);
  const [exportLabel, setExportLabel] = useState("Save still");
  const frame = frames[Math.min(frameIndex, frames.length - 1)];
  const comparison = phases[Math.min(compareIndex, phases.length - 1)];
  const phaseMarkers = useMemo(() => phases.map((phase) => ({
    ...phase,
    index: Math.max(0, frames.findIndex((candidate) => candidate === phase.frame)),
  })), [frames, phases]);

  async function downloadStill() {
    if (!videoSrc || !frame || !sourceWidth || !sourceHeight) return;
    setExportLabel("Saving…");
    try {
      const blob = await renderExportStill({
        videoSrc,
        timestampMs: frame.timestampMs,
        landmarks: frame.landmarks,
        sourceWidth,
        sourceHeight,
        contactPlaneX: phases.find((phase) => phase.frame === frame)?.contactPlaneX,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `swinglens-${frame.timestampMs}ms.png`;
      link.click();
      URL.revokeObjectURL(url);
      setExportLabel("Saved");
      window.setTimeout(() => setExportLabel("Save still"), 1600);
    } catch {
      setExportLabel("Save failed");
      window.setTimeout(() => setExportLabel("Save still"), 1800);
    }
  }

  if (!frame) return null;

  return (
    <section className="review-studio no-print" aria-labelledby="review-title">
      <div className="studio-head">
        <div>
          <p className="eyebrow light"><span /> FRAME LAB</p>
          <h3 id="review-title">Inspect the evidence, sample by sample.</h3>
          <p>Scrub only the tracked source samples. SwingLens does not invent frames between them.</p>
        </div>
        <div className="studio-tools">
          <button className={showSkeleton ? "active" : ""} onClick={() => setShowSkeleton((value) => !value)}>
            <Icon name={showSkeleton ? "eye" : "eyeOff"} /> {showSkeleton ? "Overlay on" : "Overlay off"}
          </button>
          <button className={compare ? "active" : ""} onClick={() => setCompare((value) => !value)}>
            <Icon name="compare" /> Compare
          </button>
          {videoSrc ? (
            <button onClick={() => void downloadStill()} disabled={exportLabel === "Saving…"}>
              <Icon name="print" /> {exportLabel}
            </button>
          ) : null}
        </div>
      </div>

      <div className={`studio-frames ${compare ? "is-comparing" : ""}`}>
        <SkeletonView frame={frame} label={`Sample ${frameIndex + 1}`} showSkeleton={showSkeleton} aspectRatio={aspectRatio} videoSrc={videoSrc} />
        {compare && comparison && (
          <SkeletonView
            frame={comparison.frame}
            label={comparison.label}
            showSkeleton={showSkeleton}
            aspectRatio={aspectRatio}
            videoSrc={videoSrc}
          />
        )}
      </div>

      <div className="scrubber">
        <div className="scrubber-controls">
          <button aria-label="Previous tracked sample" onClick={() => setFrameIndex((value) => Math.max(0, value - 1))}><Icon name="chevronLeft" /></button>
          <strong>{(frame.timestampMs / 1000).toFixed(2)}s</strong>
          <span>{frameIndex + 1} / {frames.length} tracked samples</span>
          <button aria-label="Next tracked sample" onClick={() => setFrameIndex((value) => Math.min(frames.length - 1, value + 1))}><Icon name="chevronRight" /></button>
        </div>
        <div className="range-wrap">
          <input aria-label="Tracked sample timeline" type="range" min="0" max={Math.max(0, frames.length - 1)} value={frameIndex} onChange={(event) => setFrameIndex(Number(event.target.value))} />
          <div className="phase-markers" aria-hidden="true">
            {phaseMarkers.map((phase) => <i key={phase.key} style={{ left: `${(phase.index / Math.max(1, frames.length - 1)) * 100}%` }} />)}
          </div>
        </div>
      </div>

      {compare && (
        <label className="compare-select">Compare against
          <select value={compareIndex} onChange={(event) => setCompareIndex(Number(event.target.value))}>
            {phases.map((phase, index) => <option key={phase.key} value={index}>{phase.label}</option>)}
          </select>
        </label>
      )}
    </section>
  );
}
