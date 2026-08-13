"use client";

import { useMemo, useState } from "react";
import { getDrillSuggestions } from "@/lib/drills";
import type { AnalysisResult, MetricUnit, PhaseKey } from "@/lib/types";
import { MAX_ANALYZED_SECONDS, type VideoAnalysisOutput } from "@/lib/video-analysis";
import { Icon } from "./Icon";
import { ReviewStudio } from "./ReviewStudio";
import { SkeletonView } from "./SkeletonView";

const PHASE_ORDER: PhaseKey[] = ["trigger", "execution", "impact", "follow"];

function MetricValue({ value, unit }: { value: number; unit: MetricUnit }) {
  if (unit === "°") return <>{Math.round(value)}°</>;
  if (unit === "torso") return <>{value.toFixed(2)}×</>;
  return <>{value.toFixed(2)}</>;
}

export function AnalysisReport({
  result,
  videoMeta,
  isDemo,
  onReset,
}: {
  result: AnalysisResult;
  videoMeta: VideoAnalysisOutput | null;
  isDemo: boolean;
  onReset: () => void;
}) {
  const [activePhase, setActivePhase] = useState<PhaseKey>("impact");
  const [viewMode, setViewMode] = useState<"player" | "coach">("player");
  const [shareLabel, setShareLabel] = useState("Share summary");
  const selectedPhase = useMemo(
    () => result.phases.find((phase) => phase.key === activePhase) ?? result.phases[0],
    [activePhase, result.phases],
  );
  const drills = useMemo(() => getDrillSuggestions(result), [result]);
  const aspectRatio = videoMeta && videoMeta.analyzedHeight > 0
    ? videoMeta.analyzedWidth / videoMeta.analyzedHeight
    : 1;

  async function shareReport() {
    const summary = [
      "SwingLens on-device swing report",
      `Score: ${result.score ?? "withheld"}`,
      ...result.strengths.map((item) => `Keep: ${item}`),
      ...result.adjustments.map((item) => `Next: ${item}`),
      "2D prototype cues — not medical advice or confirmed ball-contact data.",
    ].join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ title: "SwingLens report", text: summary, url: window.location.origin });
        return;
      }
      await navigator.clipboard.writeText(summary);
      setShareLabel("Copied");
      window.setTimeout(() => setShareLabel("Share summary"), 1800);
    } catch {
      setShareLabel("Share cancelled");
      window.setTimeout(() => setShareLabel("Share summary"), 1800);
    }
  }

  return (
    <section className="results" id="analysis-result" aria-labelledby="result-title">
      <div className="result-topline no-print">
        <div className="report-mode" role="group" aria-label="Report detail">
          <button className={viewMode === "player" ? "active" : ""} onClick={() => setViewMode("player")}>Player view</button>
          <button className={viewMode === "coach" ? "active" : ""} onClick={() => setViewMode("coach")}>Coach view</button>
        </div>
        <div className="result-actions">
          <button onClick={shareReport}><Icon name="share" /> {shareLabel}</button>
          <button onClick={() => window.print()}><Icon name="print" /> Save PDF</button>
        </div>
      </div>

      <div className="result-head">
        <div>
          <p className="eyebrow"><span /> {isDemo ? "SAMPLE REPORT" : "YOUR REPORT"}</p>
          <h2 id="result-title">{result.canCoach ? "Your swing is ready to review." : "Let’s improve the capture first."}</h2>
          <p>{isDemo ? "A functional demo built from synthetic pose landmarks — not a real athlete result." : `${result.sampledFrames} timestamps were inspected entirely on this device.`}</p>
        </div>
        <div className={`score-ring ${result.score === null ? "no-score" : ""}`} style={{ "--score": result.score ?? 0 } as React.CSSProperties}>
          <strong>{result.score ?? "—"}</strong><span>{result.score === null ? "RETAKE" : "PROTOTYPE SCORE"}</span>
        </div>
      </div>

      <div className={`quality-grid ${viewMode === "player" ? "player-diagnostics" : ""}`}>
        {result.quality.map((check) => (
          <article key={check.key} className={`quality ${check.status}`}>
            <span className="status-dot"><Icon name={check.status === "pass" ? "check" : "warn"} /></span>
            <div><b>{check.label}</b><p>{check.detail}</p></div>
          </article>
        ))}
      </div>

      {videoMeta?.truncated && <p className="notice"><Icon name="warn" /> This clip was longer than {MAX_ANALYZED_SECONDS} seconds, so only the first {MAX_ANALYZED_SECONDS} seconds were analyzed.</p>}

      {result.canCoach && selectedPhase && (
        <div className={`phase-report ${viewMode}-view`}>
          <div className="phase-tabs" role="tablist" aria-label="Swing checkpoints">
            {PHASE_ORDER.map((key, index) => {
              const phase = result.phases.find((item) => item.key === key);
              return phase ? <button key={key} role="tab" aria-selected={activePhase === key} className={activePhase === key ? "active" : ""} onClick={() => setActivePhase(key)}><span>0{index + 1}</span>{phase.label}</button> : null;
            })}
          </div>
          <div className="phase-grid">
            <SkeletonView
              frame={selectedPhase.frame}
              label={selectedPhase.label}
              pathPoints={selectedPhase.key === "follow" ? selectedPhase.swingPath?.points : undefined}
              aspectRatio={aspectRatio}
            />
            <div className="metric-panel">
              <div className="metric-heading"><div><p>{selectedPhase.description}</p><h3>{selectedPhase.label}</h3></div><strong>{selectedPhase.score}</strong></div>
              {selectedPhase.key === "impact" && (
                <p className="impact-note">This is the frame from your video at peak hand speed. Use it to check whether the batter is squaring up to the pitch.</p>
              )}
              <div className="metric-list">
                {selectedPhase.metrics.map((metric) => (
                  <article key={metric.key} className={metric.status}>
                    <div className="metric-top"><span>{metric.label}</span><b><MetricValue value={metric.value} unit={metric.unit} /></b></div>
                    <div className="metric-bar"><span style={{ width: `${Math.max(4, metric.score)}%` }} /></div>
                    <p>{metric.note}</p>
                    <small>Prototype range {metric.reference[0]}–{metric.reference[1]}{metric.unit === "torso" ? "× torso" : metric.unit === "ratio" ? " roundness" : metric.unit}</small>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="coaching-grid">
        <article className="coach-card strength"><span className="card-kicker">KEEP</span><h3>What held up</h3><ul>{result.strengths.length ? result.strengths.map((item) => <li key={item}><Icon name="check" />{item}</li>) : <li>Pass the capture checks first, then SwingLens can identify strengths.</li>}</ul></article>
        <article className="coach-card adjustment"><span className="card-kicker">NEXT</span><h3>What to try next</h3><ul>{result.adjustments.map((item) => <li key={item}><Icon name="arrow" />{item}</li>)}</ul></article>
      </div>

      <section className="drill-section" aria-labelledby="drill-title">
        <div className="section-minihead"><div><p className="eyebrow"><span /> NEXT REPS</p><h3 id="drill-title">Turn the evidence into a short practice plan.</h3></div><p>Rule-based suggestions tied to the lowest-scoring 2D cues. Stop if anything hurts.</p></div>
        <div className="drill-grid">
          {drills.map((drill, index) => (
            <article key={drill.key} className="drill-card">
              <span className="drill-number">0{index + 1}</span>
              <p>{drill.reason}</p><h4>{drill.title}</h4>
              <div><b>{drill.dose}</b><span>{drill.cue}</span></div>
              <ol>{drill.steps.map((step) => <li key={step}>{step}</li>)}</ol>
            </article>
          ))}
        </div>
      </section>

      {result.canCoach && videoMeta?.frames.length ? (
        <ReviewStudio frames={videoMeta.frames} phases={result.phases} aspectRatio={aspectRatio} />
      ) : null}

      <div className="evidence-note">
        <Icon name="warn" />
        <div><b>What this report does not claim</b><p>The contact candidate is a wrist-speed peak, not detected ball contact. A single 2D video cannot provide bat speed, exit velocity, true attack angle, or 3D rotation. Checkpoint ranges remain coach-validation-pending prototype values.</p></div>
      </div>
      <div className="result-footer"><p>{result.disclaimer}</p><button className="button ghost-dark no-print" onClick={onReset}>Review another swing</button></div>
    </section>
  );
}
