"use client";

import { useMemo, useState } from "react";
import { analyzeMotion } from "@/lib/motion-analysis";
import { getSport, type CameraView, type PracticeGoal, type SportId } from "@/lib/sports";
import type { VideoAnalysisOutput } from "@/lib/video-analysis";
import { SkeletonView } from "./SkeletonView";

export function MotionReport({ output, sport, name, view, goal, videoSrc, isDemo, onReset }: {
  output: VideoAnalysisOutput; sport: SportId; name: string; view: CameraView; goal: PracticeGoal;
  videoSrc: string | null; isDemo: boolean; onReset: () => void;
}) {
  const summary = useMemo(() => analyzeMotion(output.frames, output.expectedSamples,
    output.sourceWidth / output.sourceHeight, sport, view, goal), [output, sport, view, goal]);
  const [index, setIndex] = useState(0);
  const [reference, setReference] = useState<number | null>(null);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const frames = summary.usableFrames;
  const frame = frames[Math.min(index, frames.length - 1)];
  const aspect = output.sourceWidth / output.sourceHeight;
  function exportReport() {
    const blob = new Blob([JSON.stringify({
      schema: "swinglens-motion-v1", sport, name, view, goal, synthetic: isDemo,
      measured: "projected-2D-only", summary: { ...summary, usableFrames: undefined },
      source: { width: output.sourceWidth, height: output.sourceHeight, fps: output.sourceFps,
        timestamps: output.timestampMode }, frames: frames.map((frame) => {
          const copy = { ...frame };
          delete copy.previewDataUrl;
          return copy;
        }),
    }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `swinglens-${sport}-review.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  return <section className="motion-report" id="analysis-result" aria-labelledby="motion-report-title">
    <div className="motion-report-header">
      <div><p className="eyebrow">MOVEMENT REVIEW · {name.toUpperCase()}</p>
        <h2 id="motion-report-title">{summary.canReview ? `${name}: ready to review.` : "A clearer recording is needed."}</h2>
        <p>{getSport(sport).focus} · {view} camera · {goal} goal</p></div>
      <div className="motion-actions no-print"><button onClick={exportReport}>Download report</button>
        <button onClick={() => window.print()}>Print / save PDF</button><button onClick={onReset}>New recording</button></div>
    </div>
    {isDemo && <p className="motion-notice" role="status">Synthetic pose landmarks for interface exploration only. This is not a real {name.toLowerCase()} performance or a validated technique example.</p>}
    <div className="motion-stats">
      <div><strong>{frames.length}</strong><span>Reliable body frames</span></div>
      <div><strong>{Math.round(summary.coverage * 100)}%</strong><span>Full-body coverage</span></div>
      <div><strong>{summary.observedFps.toFixed(1)}</strong><span>Usable samples / second</span></div>
      <div><strong>{summary.canReview ? "Review" : "Retake"}</strong><span>No universal technique score</span></div>
    </div>
    <div className="motion-notice"><ul>{summary.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>
    {frame && <div className="motion-lab">
      <div className={`motion-frames ${reference !== null ? "compare" : ""}`}>
        <SkeletonView frame={frame} label="Observed checkpoint" videoSrc={videoSrc} aspectRatio={aspect} showSkeleton={showSkeleton} />
        {reference !== null && frames[reference] && <SkeletonView frame={frames[reference]} label="Your comparison checkpoint" videoSrc={videoSrc} aspectRatio={aspect} showSkeleton={showSkeleton} />}
      </div>
      <div className="motion-controls no-print">
        <button aria-label="Previous body frame" disabled={index === 0} onClick={() => setIndex((i) => Math.max(0, i - 1))}>←</button>
        <input type="range" aria-label="Body frame timeline" min={0} max={Math.max(0, frames.length - 1)} value={index} onChange={(e) => setIndex(Number(e.target.value))} />
        <button aria-label="Next body frame" disabled={index >= frames.length - 1} onClick={() => setIndex((i) => Math.min(frames.length - 1, i + 1))}>→</button>
        <button onClick={() => setReference(index)}>Pin comparison frame</button>
        {reference !== null && <button onClick={() => setReference(null)}>Clear comparison</button>}
        <label><input type="checkbox" checked={showSkeleton} onChange={(e) => setShowSkeleton(e.target.checked)} /> Skeleton</label>
      </div>
    </div>}
    {summary.metrics.length > 0 && <div className="motion-metrics"><h3>Observed 2D angle ranges</h3>
      <p>Camera-plane projections, not 3D joint angles or target ranges. Differences may reflect viewpoint or pose error.</p>
      <div className="motion-stats">{summary.metrics.map((metric) => <div key={metric.label}>
        <strong>{metric.min.toFixed(0)}–{metric.max.toFixed(0)}°</strong><span>{metric.label} · {metric.samples} samples</span>
      </div>)}</div></div>}
    <section id="coach" className="motion-practice" aria-label="Sport-specific review recommendations">
      <h3>{summary.canReview ? "Your next review session" : "Before trying again"}</h3>
      {summary.recommendations.map((rec) => <article key={rec.title}><h4>{rec.title}</h4><p>{rec.evidence}</p>
        <ol>{rec.steps.map((step) => <li key={step}>{step}</li>)}</ol></article>)}
      {!summary.canReview && <p>{getSport(sport).capture} Keep one athlete visible for at least eight reliable frames.</p>}
      <p className="motion-boundary">Review prompts are local, rule-based and inspectable—not advice from a trained multisport coach or a generative model. No injury diagnosis, force, physical speed, contact or ideal-form score is inferred.</p>
    </section>
  </section>;
}
