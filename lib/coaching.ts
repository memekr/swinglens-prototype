import type { AnalysisResult, MetricResult, PhaseKey, PhaseResult } from "./types";

type RankedCue = {
  phaseKey: PhaseKey;
  phaseLabel: string;
  metric: MetricResult;
};

function rankedCues(phases: PhaseResult[]): RankedCue[] {
  return phases.flatMap((phase) =>
    phase.metrics.map((metric) => ({ phaseKey: phase.key, phaseLabel: phase.label, metric })),
  );
}

export function buildCoaching(phases: PhaseResult[]): Pick<AnalysisResult, "strengths" | "adjustments"> {
  const cues = rankedCues(phases);
  const strengths = [...cues]
    .filter((item) => item.metric.status === "good")
    .sort((a, b) => b.metric.score - a.metric.score)
    .slice(0, 2)
    .map((item) => `${item.phaseLabel}: ${item.metric.note}`);
  const adjustments = [...cues]
    .filter((item) => item.metric.status === "watch")
    .sort((a, b) => a.metric.score - b.metric.score)
    .slice(0, 2)
    .map((item) => `${item.phaseLabel}: ${item.metric.note}`);
  return {
    strengths: strengths.length ? strengths : ["The full-body pose stayed stable enough to read trigger, landing, and backspace."],
    adjustments: adjustments.length
      ? adjustments
      : ["No major 2D departure showed up. Keep the hip hinge, land, then turn foot-knee-hip-barrel with space still on the rear side."],
  };
}
