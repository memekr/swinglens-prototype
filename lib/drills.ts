import type { AnalysisResult, MetricKey } from "./types";

export type DrillSuggestion = {
  key: MetricKey | "capture";
  title: string;
  dose: string;
  cue: string;
  steps: string[];
  reason: string;
};

const DRILLS: Record<MetricKey, Omit<DrillSuggestion, "key" | "reason">> = {
  leadKnee: {
    title: "Lead-leg freeze reps",
    dose: "2 × 5 slow reps",
    cue: "Land, hold, then turn",
    steps: ["Stride at 50% speed.", "Freeze when the front heel plants.", "Check that the knee stays stacked before finishing the turn."],
  },
  torsoLean: {
    title: "Wall posture turns",
    dose: "2 × 6 turns",
    cue: "Turn around a quiet spine",
    steps: ["Set up a hand-width from a wall.", "Rotate without the head drifting into the wall.", "Repeat at game-speed posture, without a ball."],
  },
  separation: {
    title: "Walk-through sequence",
    dose: "3 × 4 swings",
    cue: "Lower half leads, hands follow",
    steps: ["Begin with the feet close together.", "Step into launch while the hands stay back.", "Finish smoothly; do not force extra twist."],
  },
  headMovement: {
    title: "Head-gate dry swings",
    dose: "2 × 5 dry swings",
    cue: "Move the center, not the camera target",
    steps: ["Place two visual markers around the head in a mirror.", "Make a controlled dry swing.", "Keep the head inside the gate while allowing natural weight shift."],
  },
};

export function getDrillSuggestions(result: AnalysisResult): DrillSuggestion[] {
  if (!result.canCoach) {
    return [{
      key: "capture",
      title: "Clean-capture rehearsal",
      dose: "1 test clip",
      cue: "Full body, fixed camera, one swing",
      steps: ["Set the phone at belt height in landscape.", "Leave space around the bat path, head, and feet.", "Record one complete swing in bright, even light."],
      reason: "Analysis was withheld because the evidence did not pass capture checks.",
    }];
  }

  const ranked = result.phases
    .flatMap((phase) => phase.metrics.map((metric) => ({ phase: phase.label, metric })))
    .sort((a, b) => a.metric.score - b.metric.score);
  const seen = new Set<MetricKey>();
  const suggestions: DrillSuggestion[] = [];
  for (const item of ranked) {
    if (seen.has(item.metric.key)) continue;
    seen.add(item.metric.key);
    suggestions.push({
      key: item.metric.key,
      ...DRILLS[item.metric.key],
      reason: `${item.phase} · ${item.metric.label}`,
    });
    if (suggestions.length === 2) break;
  }
  return suggestions;
}
