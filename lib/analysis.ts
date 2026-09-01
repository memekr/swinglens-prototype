import { buildCoaching } from "./coaching";
import {
  angleDegrees,
  axisAngleDifference,
  distance,
  lineAngleDegrees,
  midpoint,
  torsoScale,
} from "./geometry";
import { CORE_JOINTS } from "./skeleton";
import type {
  AnalysisResult,
  CoreMetricKey,
  Handedness,
  MetricResult,
  MetricUnit,
  PhaseDefinition,
  PhaseKey,
  PoseFrame,
  QualityCheck,
  Skeleton,
  SwingPath,
} from "./types";
import type { BodyJoint } from "./types";

/**
 * Four checkpoints, in the batting sequence the coaching team defined:
 * Trigger — the initial movement that sets rhythm and timing.
 * Execution — front foot plants, then the kinetic chain fires foot, knee,
 *   hip, upper body.
 * Impact — the bat-ball contact candidate (peak hand speed).
 * Follow-through — after impact; shows the finish and the tracked hand path.
 */
const PHASE_COPY: Record<PhaseKey, Pick<PhaseDefinition, "label" | "description">> = {
  trigger: {
    label: "Trigger",
    description: "The first move that sets rhythm and timing, before the ground-up rotation begins",
  },
  execution: {
    label: "Execution",
    description: "Front foot plants, then the kinetic chain fires: foot, knee, hip, upper body",
  },
  impact: {
    label: "Impact",
    description: "Contact window: last high-speed sample with the hands still below the head — not confirmed ball contact",
  },
  follow: {
    label: "Follow-through",
    description: "After impact. The finish, and the tracked hand path across it",
  },
};

type ReferenceMap = Record<CoreMetricKey, [number, number]>;

// Inherited 1:1 from the prior setup/launch/contact/follow bands. Still
// prototype values pending coach and dataset validation, not re-derived —
// the swing's rough progression (stance-like → mid-rotation → peak → extension)
// still holds under the new checkpoint definitions.
const REFERENCES: Record<PhaseKey, ReferenceMap> = {
  trigger: { leadKnee: [145, 178], torsoLean: [0, 18], separation: [0, 18], headMovement: [0, 0.24] },
  execution: { leadKnee: [132, 172], torsoLean: [2, 24], separation: [4, 28], headMovement: [0, 0.34] },
  impact: { leadKnee: [118, 168], torsoLean: [2, 28], separation: [7, 36], headMovement: [0, 0.42] },
  follow: { leadKnee: [120, 175], torsoLean: [0, 34], separation: [0, 38], headMovement: [0, 0.58] },
};

// Roundness = max perpendicular bow off the impact-to-follow-through chord,
// as a fraction of the chord length. 0 is a straight line; higher is more arced.
const SWING_PATH_REFERENCE: [number, number] = [0.07, 0.55];
const MIN_UPWARD_RATIO = 0.04;

function rangeScore(value: number, [min, max]: [number, number]): number {
  if (!Number.isFinite(value)) return 0;
  if (value >= min && value <= max) return 100;
  const width = Math.max(max - min, max * 0.2, 1);
  const gap = value < min ? min - value : value - max;
  return Math.max(0, Math.round(72 - (gap / width) * 45));
}

function smooth(values: number[]): number[] {
  return values.map((_, index) => {
    const from = Math.max(0, index - 1);
    const to = Math.min(values.length - 1, index + 1);
    const window = values.slice(from, to + 1);
    return window.reduce((sum, value) => sum + value, 0) / window.length;
  });
}

function handCenter(landmarks: Skeleton) {
  return midpoint(landmarks.leftHand, landmarks.rightHand);
}

/** The lead (front, pitcher-side) leg's joints for this batter's stance. */
function leadJoints(handedness: Handedness): { hip: BodyJoint; knee: BodyJoint; foot: BodyJoint } {
  return handedness === "right"
    ? { hip: "leftHipJoint", knee: "leftKnee", foot: "leftFoot" }
    : { hip: "rightHipJoint", knee: "rightKnee", foot: "rightFoot" };
}

/**
 * Contact is near the start of the high-speed window, not the absolute
 * peak. Peak wrist speed on a phone clip is usually already wrapping
 * (hands up by the head). Prefer the last fast sample where the hands
 * are still below the head — the hitting zone, not the finish.
 */
export function pickImpactIndex(frames: PoseFrame[], speeds: number[], searchStart: number, searchEnd: number): number {
  let peakIndex = searchStart;
  for (let index = searchStart + 1; index < searchEnd; index += 1) {
    if (speeds[index] > speeds[peakIndex]) peakIndex = index;
  }
  const peak = Math.max(speeds[peakIndex], 1e-6);
  let riseIndex = peakIndex;
  for (let index = searchStart; index <= peakIndex; index += 1) {
    if (speeds[index] >= peak * 0.82) {
      riseIndex = index;
      break;
    }
  }

  const handsBelowHead = (index: number) => {
    const landmarks = frames[index].landmarks;
    const hands = handCenter(landmarks);
    return hands.y >= landmarks.head.y + 0.035;
  };

  let contactIndex = riseIndex;
  for (let index = riseIndex; index <= peakIndex; index += 1) {
    if (handsBelowHead(index)) contactIndex = index;
  }
  if (!handsBelowHead(contactIndex)) {
    for (let index = riseIndex - 1; index >= searchStart; index -= 1) {
      if (handsBelowHead(index)) {
        contactIndex = index;
        break;
      }
    }
  }
  return Math.max(searchStart, Math.min(contactIndex, searchEnd - 1));
}

/**
 * Frame-index detector for the four checkpoints. Impact anchors the search.
 * Trigger and Execution are then found by walking backward from Impact:
 * Trigger at the first meaningful departure from the still starting
 * position, Execution at the lead foot's most-planted sample after that.
 */
export function detectPhases(frames: PoseFrame[], handedness: Handedness): PhaseDefinition[] {
  if (frames.length < 4) return [];

  const lead = leadJoints(handedness);
  const scaleAt = (index: number) => torsoScale(frames[index].landmarks);

  const handSpeeds = frames.map((frame, index) => {
    if (index === 0) return 0;
    const previous = frames[index - 1];
    const deltaSeconds = Math.max((frame.timestampMs - previous.timestampMs) / 1000, 1 / 120);
    const scale = (scaleAt(index) + scaleAt(index - 1)) / 2;
    return distance(handCenter(frame.landmarks), handCenter(previous.landmarks)) / scale / deltaSeconds;
  });
  const speeds = smooth(handSpeeds);

  const searchStart = Math.max(1, Math.floor(frames.length * 0.2));
  const searchEnd = Math.max(searchStart + 1, Math.ceil(frames.length * 0.84));
  const impactIndex = pickImpactIndex(frames, speeds, searchStart, searchEnd);

  // Trigger: first sample where hands + hips + lead knee have moved
  // meaningfully from the still starting frame (motion onset).
  const baseline = frames[0].landmarks;
  const baselineScale = Math.max(scaleAt(0), 1e-4);
  const motionOnset = frames.map((frame) => {
    const hand = distance(handCenter(frame.landmarks), handCenter(baseline));
    const hip = distance(frame.landmarks.centerHip, baseline.centerHip);
    const knee = distance(frame.landmarks[lead.knee], baseline[lead.knee]);
    return (hand + hip * 1.4 + knee) / baselineScale;
  });
  const onsetPeak = Math.max(1e-6, ...motionOnset.slice(0, impactIndex + 1));
  const onsetThreshold = onsetPeak * 0.12;
  let triggerIndex = 1;
  for (let index = 1; index <= impactIndex; index += 1) {
    if (motionOnset[index] >= onsetThreshold) {
      triggerIndex = index;
      break;
    }
  }
  triggerIndex = Math.max(1, Math.min(triggerIndex, Math.max(1, impactIndex - 2)));

  // Execution: the lead foot's most-planted (largest y, closest to the
  // ground) sample between Trigger and Impact — the stride landing.
  const windowStart = Math.min(triggerIndex + 1, impactIndex - 1);
  let executionIndex = windowStart;
  let plantedY = frames[windowStart].landmarks[lead.foot].y;
  for (let index = windowStart; index < impactIndex; index += 1) {
    const footY = frames[index].landmarks[lead.foot].y;
    if (footY >= plantedY) {
      plantedY = footY;
      executionIndex = index;
    }
  }
  executionIndex = Math.max(triggerIndex + 1, Math.min(executionIndex, impactIndex - 1));

  const followIndex = Math.min(frames.length - 1, impactIndex + Math.max(2, Math.round(frames.length * 0.16)));

  return [
    { key: "trigger", ...PHASE_COPY.trigger, frameIndex: triggerIndex },
    { key: "execution", ...PHASE_COPY.execution, frameIndex: executionIndex },
    { key: "impact", ...PHASE_COPY.impact, frameIndex: impactIndex },
    { key: "follow", ...PHASE_COPY.follow, frameIndex: followIndex },
  ];
}

function phaseMetrics(
  phase: PhaseKey,
  frame: PoseFrame,
  triggerFrame: PoseFrame,
  handedness: Handedness,
): MetricResult[] {
  const landmarks = frame.landmarks;
  const lead = leadJoints(handedness);
  const shoulders = midpoint(landmarks.leftShoulder, landmarks.rightShoulder);
  const hips = landmarks.centerHip;
  const triggerHips = triggerFrame.landmarks.centerHip;
  const triggerHead = triggerFrame.landmarks.head;
  const currentHeadOffset = { ...landmarks.head, x: landmarks.head.x - hips.x, y: landmarks.head.y - hips.y };
  const triggerHeadOffset = { ...triggerHead, x: triggerHead.x - triggerHips.x, y: triggerHead.y - triggerHips.y };
  const values: Record<CoreMetricKey, number> = {
    leadKnee: angleDegrees(landmarks[lead.hip], landmarks[lead.knee], landmarks[lead.foot]),
    torsoLean: Math.abs((Math.atan2(shoulders.x - hips.x, hips.y - shoulders.y) * 180) / Math.PI),
    separation: axisAngleDifference(
      lineAngleDegrees(landmarks.leftShoulder, landmarks.rightShoulder),
      lineAngleDegrees(landmarks.leftHipJoint, landmarks.rightHipJoint),
    ),
    headMovement: distance(currentHeadOffset, triggerHeadOffset) / torsoScale(triggerFrame.landmarks),
  };
  const copy: Record<CoreMetricKey, { label: string; unit: MetricUnit; good: string; watch: string }> = {
    leadKnee: {
      label: "Lead-knee angle",
      unit: "°",
      good: "Your lead leg is supporting this checkpoint inside the prototype range.",
      watch: "Review lead-knee flexion on the frame; camera angle can change this 2D value.",
    },
    torsoLean: {
      label: "Torso lean",
      unit: "°",
      good: "Torso lean sits inside the prototype range for this checkpoint.",
      watch: "Check whether the upper body is standing up early or collapsing over the plate.",
    },
    separation: {
      label: "Shoulder–hip line gap",
      unit: "°",
      good: "The on-screen shoulder and hip lines sit inside the prototype range.",
      watch: "Review rotation timing. This is a 2D screen-space proxy, not a 3D separation angle.",
    },
    headMovement: {
      label: "Relative head travel",
      unit: "torso",
      good: "Head position stays relatively stable against the pelvis.",
      watch: "Head travel is large relative to the pelvis. Check both weight shift and camera shake.",
    },
  };

  return (Object.keys(values) as CoreMetricKey[]).map((key) => {
    const reference = REFERENCES[phase][key];
    const score = rangeScore(values[key], reference);
    const inRange = Number.isFinite(values[key]) && values[key] >= reference[0] && values[key] <= reference[1];
    return {
      key,
      label: copy[key].label,
      value: values[key],
      unit: copy[key].unit,
      reference,
      score,
      status: inRange ? "good" : "watch",
      note: inRange ? copy[key].good : copy[key].watch,
    };
  });
}

/**
 * The tracked hand path from Impact through Follow-through: the honest
 * proxy for bat barrel path (the bat itself isn't tracked). Checked against
 * the desired shape: a circular, slightly upward arc.
 */
function computeSwingPath(frames: PoseFrame[], impactIndex: number, followIndex: number): SwingPath {
  const start = Math.max(0, Math.min(impactIndex, followIndex));
  const end = Math.min(frames.length - 1, Math.max(impactIndex, followIndex));
  const points = frames.slice(start, end + 1).map((frame) => handCenter(frame.landmarks));
  const first = points[0];
  const last = points[points.length - 1];
  const dx = last.x - first.x;
  const dy = last.y - first.y;
  const chord = Math.max(Math.hypot(dx, dy), 1e-4);
  // Image y grows downward, so a rising path has a negative dy.
  const upwardRatio = -dy / chord;
  const bow = points.map((point) => {
    const t = ((point.x - first.x) * dx + (point.y - first.y) * dy) / (chord * chord);
    const projX = first.x + t * dx;
    const projY = first.y + t * dy;
    return Math.hypot(point.x - projX, point.y - projY);
  });
  const roundness = Math.max(...bow, 0) / chord;
  const trendsUp = upwardRatio >= MIN_UPWARD_RATIO;
  const inRange = trendsUp && roundness >= SWING_PATH_REFERENCE[0] && roundness <= SWING_PATH_REFERENCE[1];

  return {
    points,
    upwardRatio,
    roundness,
    status: inRange ? "good" : "watch",
    note: inRange
      ? "The tracked hand path arcs upward through the follow-through, consistent with a circular, slightly upward bat path."
      : trendsUp
        ? "The hand path trends upward but looks flatter than a circular finish here. This tracks hand position, not the bat barrel."
        : "The hand path is flat or trends down here, short of the circular, slightly upward target shape. This tracks hand position, not the bat barrel.",
  };
}

function swingPathMetric(path: SwingPath): MetricResult {
  const penalty = path.upwardRatio < MIN_UPWARD_RATIO ? 20 : 0;
  return {
    key: "swingPath",
    label: "Swing path shape",
    value: path.roundness,
    unit: "ratio",
    reference: SWING_PATH_REFERENCE,
    score: Math.max(0, rangeScore(path.roundness, SWING_PATH_REFERENCE) - penalty),
    status: path.status,
    note: path.note,
  };
}

function qualityChecks(frames: PoseFrame[], expectedSamples: number): QualityCheck[] {
  if (frames.length === 0) {
    return [{ key: "pose", label: "Person detection", status: "fail", detail: "No full-body pose was found." }];
  }
  const coverage = frames.length / Math.max(expectedSamples, 1);
  const averageConfidence = frames.reduce((sum, frame) => sum + frame.confidence, 0) / frames.length;
  const bodyHeights = frames.map((frame) => {
    const ys = CORE_JOINTS.map((joint) => frame.landmarks[joint]?.y).filter(Number.isFinite);
    return Math.max(...ys) - Math.min(...ys);
  });
  const bodyHeight = bodyHeights.reduce((sum, value) => sum + value, 0) / bodyHeights.length;
  const clippedRatio = frames.filter((frame) => {
    const points = [frame.landmarks.head, frame.landmarks.leftFoot, frame.landmarks.rightFoot];
    return points.some((point) => point.x < 0.025 || point.x > 0.975 || point.y < 0.025 || point.y > 0.975);
  }).length / frames.length;
  const firstHip = frames[0].landmarks.centerHip;
  const firstHand = handCenter(frames[0].landmarks);
  const firstRelativeHand = { ...firstHand, x: firstHand.x - firstHip.x, y: firstHand.y - firstHip.y };
  const motionSpan = Math.max(...frames.map((frame) => {
    const hip = frame.landmarks.centerHip;
    const hand = handCenter(frame.landmarks);
    const relativeHand = { ...hand, x: hand.x - hip.x, y: hand.y - hip.y };
    return distance(relativeHand, firstRelativeHand) / torsoScale(frame.landmarks);
  }));

  return [
    {
      key: "coverage",
      label: "Pose coverage",
      status: coverage >= 0.72 ? "pass" : coverage >= 0.48 ? "warn" : "fail",
      detail: `A full-body pose was found in ${Math.round(coverage * 100)}% of sampled frames.`,
    },
    {
      key: "confidence",
      label: "Joint confidence",
      status: averageConfidence >= 0.68 ? "pass" : averageConfidence >= 0.5 ? "warn" : "fail",
      detail: `Key-joint confidence averages ${Math.round(averageConfidence * 100)}%.`,
    },
    {
      key: "framing",
      label: "Subject scale",
      status: bodyHeight >= 0.46 && bodyHeight <= 0.94 ? "pass" : bodyHeight >= 0.33 ? "warn" : "fail",
      detail: bodyHeight < 0.46 ? "The hitter is small in frame. Move the camera slightly closer." : "Full-body scale is suitable for analysis.",
    },
    {
      key: "clipping",
      label: "Frame clearance",
      status: clippedRatio <= 0.08 ? "pass" : clippedRatio <= 0.28 ? "warn" : "fail",
      detail: clippedRatio <= 0.08 ? "Head and feet remain safely inside the frame." : "The head or feet are clipped in part of the swing.",
    },
    {
      key: "motion",
      label: "Swing motion",
      status: motionSpan >= 0.48 ? "pass" : motionSpan >= 0.28 ? "warn" : "fail",
      detail: motionSpan >= 0.48 ? "Enough hand-to-torso motion was captured." : "Record one complete swing from the trigger through follow-through.",
    },
  ];
}

export function analyzePoseSequence(
  frames: PoseFrame[],
  handedness: Handedness,
  expectedSamples = frames.length,
): AnalysisResult {
  const quality = qualityChecks(frames, expectedSamples);
  const confidence = frames.length
    ? frames.reduce((sum, frame) => sum + frame.confidence, 0) / frames.length
    : 0;
  const phases = detectPhases(frames, handedness);
  const canCoach = frames.length >= 8 && phases.length === 4 && !quality.some((check) => check.status === "fail");

  if (!canCoach) {
    return {
      score: null,
      confidence,
      canCoach: false,
      sampledFrames: expectedSamples,
      durationMs: frames.at(-1)?.timestampMs ?? 0,
      phases: [],
      quality,
      strengths: [],
      adjustments: ["Retake in landscape with the full body visible from the trigger through follow-through."],
      disclaimer: "Evidence quality was too low, so SwingLens withheld the mechanics score.",
    };
  }

  const triggerFrame = frames[phases[0].frameIndex];
  const basePhases = phases.map((phase) => {
    const frame = frames[phase.frameIndex];
    return { ...phase, frame, metrics: phaseMetrics(phase.key, frame, triggerFrame, handedness) };
  });

  const impactPhase = basePhases.find((phase) => phase.key === "impact") ?? basePhases[2];
  const followBase = basePhases.find((phase) => phase.key === "follow");
  const swingPath = followBase ? computeSwingPath(frames, impactPhase.frameIndex, followBase.frameIndex) : null;

  const phaseResults = basePhases.map((phase) => {
    const isFollow = phase.key === "follow" && swingPath !== null;
    const metrics = isFollow ? [...phase.metrics, swingPathMetric(swingPath!)] : phase.metrics;
    return {
      ...phase,
      metrics,
      swingPath: isFollow ? swingPath! : undefined,
      score: Math.round(metrics.reduce((sum, metric) => sum + metric.score, 0) / metrics.length),
    };
  });

  const { strengths, adjustments } = buildCoaching(phaseResults);
  const score = Math.round(phaseResults.reduce((sum, phase) => sum + phase.score, 0) / phaseResults.length);

  return {
    score,
    confidence,
    canCoach: true,
    sampledFrames: expectedSamples,
    durationMs: frames.at(-1)?.timestampMs ?? 0,
    phases: phaseResults,
    quality,
    strengths,
    adjustments,
    disclaimer: "These are 2D screen-space cues, not medical advice, injury diagnosis, or a replacement for a qualified coach. Impact is a contact-window sample, not confirmed ball-bat contact.",
  };
}
