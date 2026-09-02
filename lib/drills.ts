import type { AnalysisResult, MetricKey, PhaseKey } from "./types";

export type DrillSuggestion = {
  key: MetricKey | "capture";
  title: string;
  dose: string;
  cue: string;
  steps: string[];
  reason: string;
};

type DrillCard = Omit<DrillSuggestion, "reason">;

const HIP_LOAD: DrillCard = {
  key: "torsoLean",
  title: "Hip-load athletic stance",
  dose: "2 × 6 slow holds",
  cue: "Rear hip back, not a sway",
  steps: [
    "Start in your normal stance with a slight knee bend.",
    "Move the rear hip backward as if closing a car door — glute and hamstring on, not the quads.",
    "Keep the head stacked inside the back foot. If the chest drifts over the rear heel, that is a sway.",
    "Hold two seconds, then take a small stride and freeze in the power position.",
  ],
};

const ROLL: DrillCard = {
  key: "separation",
  title: "The Roll (separation)",
  dose: "2 × 8 slow reps",
  cue: "Lower half goes, hands stay",
  steps: [
    "Hold a basketball (or a light ball) at the rear shoulder so the back elbow stays organized.",
    "Stride forward with the lower body while the ball stays by the rear shoulder.",
    "Land without shoving the ball toward the pitcher. That is separation.",
    "Turn the torso so the ball (then later the barrel) enters from behind, not with a hand-push.",
  ],
};

const DROP_BAT: DrillCard = {
  key: "contactPlane",
  title: "Drop-Bat Drill",
  dose: "2 × 8 front toss",
  cue: "Barrel from behind the ball",
  steps: [
    "Take your normal stance. A partner front-tosses easy strikes.",
    "Let the barrel settle behind you — do not throw the hands at the ball. You are not dropping the bat.",
    "Turn the barrel into the pitch’s path and through the zone, slightly up (Ferris wheel, not merry-go-round).",
    "Stay square to the pitcher and drive the middle of the field. Stop if anything hurts.",
  ],
};

const FRONT_FOOT: DrillCard = {
  key: "headMovement",
  title: "Front-foot contact plane",
  dose: "2 × 6 tee or toss",
  cue: "Meet it at the front foot",
  steps: [
    "Land the front foot first, still balanced and adjustable.",
    "Imagine a vertical window up from that front foot — that is the contact area.",
    "Do not reach several feet out front (hook) and do not wait until the ball is past you (late).",
    "Turn the barrel through that window and keep the head from lunging past the front hip.",
  ],
};

const LEAD_ARM: DrillCard = {
  key: "leadKnee",
  title: "Land-then-turn connection",
  dose: "2 × 5 pause swings",
  cue: "Foot, knee, hip, then barrel",
  steps: [
    "Stride at 50% speed and freeze when the front heel plants.",
    "Check the lead knee: stacked, not collapsing, not locked stiff.",
    "Then turn: foot, knee, hip, torso. The lead arm guides; it does not shove the handle at the ball.",
    "Finish through the middle. The barrel should not cut east-to-west across the zone.",
  ],
};

function drillFor(phaseKey: PhaseKey, metricKey: MetricKey): DrillCard {
  if (metricKey === "contactPlane" || metricKey === "ballContact") return FRONT_FOOT;
  if (metricKey === "backspace" || metricKey === "deliveryStyle" || metricKey === "scapLoad") return ROLL;
  if (metricKey === "hipHinge" || metricKey === "triggerStyle") return HIP_LOAD;
  if (metricKey.startsWith("chain") || metricKey === "landingStyle" || metricKey === "leadKnee") return LEAD_ARM;
  if (metricKey === "torsoLean" && (phaseKey === "trigger" || phaseKey === "execution")) return HIP_LOAD;
  if (metricKey === "headMovement") return FRONT_FOOT;
  if (metricKey === "torsoLean") return HIP_LOAD;
  return ROLL;
}

const REASON: Partial<Record<`${PhaseKey}:${MetricKey}` | MetricKey, string>> = {
  "trigger:hipHinge": "Trigger/Timing · hip hinge into the rear hip",
  "trigger:scapLoad": "Trigger/Timing · rear scapula still on the back side",
  "trigger:triggerStyle": "Trigger/Timing · rhythm move",
  "execution:landingStyle": "Execution · toe tap vs stride",
  "execution:chainFoot": "Execution · foot, then knee, hip, barrel",
  "execution:chainKnee": "Execution · kinetic chain",
  "execution:chainHip": "Execution · pelvis after the knee",
  "execution:chainUpper": "Execution · bat last",
  "backspace:backspace": "Backspace · rear arm and rear leg still loaded",
  "backspace:deliveryStyle": "Backspace · rear-leg axis vs early dump",
  "impact:contactPlane": "Impact · front-foot contact plane",
  "impact:ballContact": "Impact · see the baseball",
};

export function getDrillSuggestions(result: AnalysisResult): DrillSuggestion[] {
  if (!result.canCoach) {
    return [{
      key: "capture",
      title: "Clean-capture rehearsal",
      dose: "1 test clip",
      cue: "Full body, fixed camera, one swing",
      steps: [
        "Set the phone at belt height in landscape.",
        "Leave space around the bat path, head, and feet.",
        "Record one complete swing in bright, even light.",
      ],
      reason: "Analysis was withheld because the evidence did not pass capture checks.",
    }];
  }

  const ranked = result.phases
    .flatMap((phase) => phase.metrics.map((metric) => ({ phase: phase.key, label: phase.label, metric })))
    .sort((a, b) => a.metric.score - b.metric.score);

  const seen = new Set<string>();
  const suggestions: DrillSuggestion[] = [];
  for (const item of ranked) {
    const card = drillFor(item.phase, item.metric.key);
    if (seen.has(card.title)) continue;
    seen.add(card.title);
    suggestions.push({
      ...card,
      reason: REASON[`${item.phase}:${item.metric.key}`] ?? `${item.label} · ${item.metric.label}`,
    });
    if (suggestions.length === 2) break;
  }
  if (suggestions.length === 0) {
    suggestions.push({
      ...DROP_BAT,
      reason: "Keep the rear hip loaded and turn foot-knee-hip-barrel even when the 2D read looks clean.",
    });
  }
  return suggestions;
}
