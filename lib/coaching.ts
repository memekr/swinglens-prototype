import type { AnalysisResult, MetricKey, MetricResult, PhaseKey, PhaseResult } from "./types";

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

/**
 * Gradum Gswing / hitting-note copy mapped onto the 2D checkpoint that fired.
 * Paraphrased for the report — not a verbatim note dump.
 */
const STRENGTH: Partial<Record<`${PhaseKey}:${MetricKey}` | MetricKey, string>> = {
  "trigger:torsoLean": "Trigger: the torso stayed quiet while you loaded. That hip-hinge posture is the athletic position the swing is built from — weight into the rear hip, not a sway.",
  "trigger:headMovement": "Trigger: the head stayed with the pelvis as you started. That usually means the load stayed inside the rear hip instead of drifting over the back foot.",
  "trigger:leadKnee": "Trigger: the front knee stayed organized as the swing started. The chain can still fire ground-up from that stance.",
  "trigger:separation": "Trigger: the shoulder and hip lines were already offset as you loaded. That is the start of back-space — lower body ready, upper body not rushing.",
  "execution:leadKnee": "Execution: the lead leg braced as the front foot planted. That is the landing the kinetic chain needs: foot, then knee, then hip, then the barrel.",
  "execution:separation": "Execution: the on-screen hip and shoulder lines opened in sequence. That is the ‘back space’ idea — 80% of the swing happens before the barrel reaches the ball.",
  "execution:torsoLean": "Execution: spine angle held as you turned. A repeatable torso lets the barrel stay on one plane instead of standing up or collapsing.",
  "execution:headMovement": "Execution: the head moved with the body, not off the ball. You can still see the pitch while the lower half lands.",
  "impact:leadKnee": "Impact: the front leg is supporting the contact window. Power is coming from rotation into a firm front side, not a collapsing knee.",
  "impact:separation": "Impact: some hip-to-shoulder offset is still visible at the contact window. That stored twist is what delivers the barrel through a longer hitting zone.",
  "impact:torsoLean": "Impact: posture at the contact window stayed inside the prototype band. The barrel can work south-to-north from a stable spine.",
  "impact:headMovement": "Impact: the head is still on the pitch at the contact window. That helps the barrel meet the ball near the front-foot plane instead of lunging.",
  "follow:swingPath": "Follow-through: the hands arced slightly upward after contact. That matches a Ferris-wheel path — barrel from behind the ball, forward and a little up — not an east-to-west cut.",
  "follow:leadKnee": "Follow-through: the front side stayed stacked into the finish. Direction through the ball is easier when the front leg does not collapse after contact.",
  "follow:torsoLean": "Follow-through: you did not pop up out of posture after contact. The finish is an extension of the same plane, not a new swing.",
  "follow:headMovement": "Follow-through: the head did not fly off the pitch after contact. You can keep direction through the baseball.",
  "follow:separation": "Follow-through: the hip and shoulder lines unwound in order. Delayed rollover is easier when the body has already rotated, not when the hands take over.",
};

const ADJUST: Partial<Record<`${PhaseKey}:${MetricKey}` | MetricKey, string>> = {
  "trigger:headMovement": "Trigger: the head drifted relative to the pelvis. That often means a sway over the back foot instead of a hip hinge into the rear hip. Load smaller — pull the rear hip back, stay inside the back foot.",
  "trigger:torsoLean": "Trigger: spine angle jumped as you started. Hinge from the hips (athletic position) rather than rounding the lower back or standing tall and quad-dominant.",
  "trigger:leadKnee": "Trigger: the front knee is not yet a stable start. Get into the power position first — slight knee bend, rear hip loaded — before the stride.",
  "trigger:separation": "Trigger: hips and shoulders are turning together too early. Keep the upper body organized while the lower body starts; that is separation, not yanking the hands back.",
  "execution:leadKnee": "Execution: the lead knee is leaving the prototype brace. Land first, then turn. If the front side collapses, the barrel gets pushed instead of rotating through.",
  "execution:separation": "Execution: the shoulder–hip gap is flat at plant. The lower half should gain ground while the hands stay connected near the rear shoulder — that is the Roll / separation feel.",
  "execution:torsoLean": "Execution: the torso is standing up or collapsing through plant. Keep one spine angle so the barrel can turn into the pitch instead of chopping or scooping.",
  "execution:headMovement": "Execution: the head is sliding off the ball as you land. Stay on the rear-hip axis a beat longer; do not rush the chest over the front foot.",
  "impact:leadKnee": "Impact: the front side is soft at the contact window. Firm up the lead leg so rotation has a brace — contact should live near the front-foot plane, not while you are still collapsing.",
  "impact:separation": "Impact: the 2D hip–shoulder gap is small at contact. That usually means the hands started the swing. Land, then let the torso turn the barrel from behind the ball.",
  "impact:torsoLean": "Impact: posture changed at the contact window. Match the shoulder plane to the pitch — do not reach up or dive. Same load, different barrel height.",
  "impact:headMovement": "Impact: the head moved a long way versus the pelvis. Check lunge versus camera shake. If it is lunge, you are leaving the contact window out in front and hooking or mishitting.",
  "follow:swingPath": "Follow-through: the hand path is flat or chopping. Think Ferris wheel, not merry-go-round: barrel from behind the ball, through, slightly up. A cut-across path pulls ground balls and hooked fouls.",
  "follow:leadKnee": "Follow-through: the front leg is not holding the finish. Keep direction through the ball — delayed rollover — instead of spinning off a soft front side.",
  "follow:torsoLean": "Follow-through: you are popping up or collapsing after contact. The finish should continue the same plane you used through the zone.",
  "follow:headMovement": "Follow-through: the head pulled off after contact. Stay through the middle of the field; spinning the face off is how the barrel cuts east-to-west.",
  "follow:separation": "Follow-through: the lines look stuck or already dumped. Finish the rotation you started at plant; do not let the hands roll the barrel early.",
};

function lineFor(item: RankedCue, table: typeof STRENGTH): string {
  return table[`${item.phaseKey}:${item.metric.key}`] ?? table[item.metric.key] ?? `${item.phaseLabel}: ${item.metric.note}`;
}

export function buildCoaching(phases: PhaseResult[]): Pick<AnalysisResult, "strengths" | "adjustments"> {
  const cues = rankedCues(phases);
  const strengths = [...cues]
    .filter((item) => item.metric.status === "good")
    .sort((a, b) => b.metric.score - a.metric.score)
    .slice(0, 2)
    .map((item) => lineFor(item, STRENGTH));
  const adjustments = [...cues]
    .filter((item) => item.metric.status === "watch")
    .sort((a, b) => a.metric.score - b.metric.score)
    .slice(0, 2)
    .map((item) => lineFor(item, ADJUST));
  return {
    strengths: strengths.length ? strengths : ["The full-body pose stayed stable enough to read the swing against the current prototype bands."],
    adjustments: adjustments.length
      ? adjustments
      : ["No major 2D departure showed up. Keep the same load, land, then turn the barrel from behind the ball through a slightly upward path."],
  };
}
