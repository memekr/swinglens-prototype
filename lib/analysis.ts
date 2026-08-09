import {
  POSE,
  angleDegrees,
  axisAngleDifference,
  distance,
  lineAngleDegrees,
  midpoint,
  torsoScale,
} from "./geometry";
import type {
  AnalysisResult,
  Handedness,
  MetricKey,
  MetricResult,
  PhaseDefinition,
  PhaseKey,
  PoseFrame,
  QualityCheck,
} from "./types";

const PHASE_COPY: Record<PhaseKey, Pick<PhaseDefinition, "label" | "description">> = {
  setup: { label: "Setup", description: "Your baseline before the swing gathers speed" },
  launch: { label: "Launch", description: "The window where hand acceleration begins" },
  contact: { label: "Contact candidate", description: "Peak wrist-speed sample — not confirmed ball contact" },
  follow: { label: "Follow-through", description: "The deceleration window after peak hand speed" },
};

type ReferenceMap = Record<MetricKey, [number, number]>;

const REFERENCES: Record<PhaseKey, ReferenceMap> = {
  setup: { leadKnee: [145, 178], torsoLean: [0, 18], separation: [0, 18], headMovement: [0, 0.24] },
  launch: { leadKnee: [132, 172], torsoLean: [2, 24], separation: [4, 28], headMovement: [0, 0.34] },
  contact: { leadKnee: [118, 168], torsoLean: [2, 28], separation: [7, 36], headMovement: [0, 0.42] },
  follow: { leadKnee: [120, 175], torsoLean: [0, 34], separation: [0, 38], headMovement: [0, 0.58] },
};

const KEY_JOINTS = [0, 11, 12, 15, 16, 23, 24, 25, 26, 27, 28];

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

export function detectPhases(frames: PoseFrame[]): PhaseDefinition[] {
  if (frames.length < 4) return [];

  const rawSpeeds = frames.map((frame, index) => {
    if (index === 0) return 0;
    const previous = frames[index - 1];
    const wrist = midpoint(frame.landmarks[POSE.leftWrist], frame.landmarks[POSE.rightWrist]);
    const previousWrist = midpoint(previous.landmarks[POSE.leftWrist], previous.landmarks[POSE.rightWrist]);
    const deltaSeconds = Math.max((frame.timestampMs - previous.timestampMs) / 1000, 1 / 120);
    const scale = (torsoScale(frame.landmarks) + torsoScale(previous.landmarks)) / 2;
    return distance(wrist, previousWrist) / scale / deltaSeconds;
  });
  const speeds = smooth(rawSpeeds);
  const searchStart = Math.max(1, Math.floor(frames.length * 0.2));
  const searchEnd = Math.max(searchStart + 1, Math.ceil(frames.length * 0.84));
  let peakIndex = searchStart;
  for (let index = searchStart + 1; index < searchEnd; index += 1) {
    if (speeds[index] > speeds[peakIndex]) peakIndex = index;
  }

  const setupIndex = Math.max(0, peakIndex - Math.max(3, Math.round(frames.length * 0.3)));
  const launchIndex = Math.max(setupIndex + 1, peakIndex - Math.max(1, Math.round(frames.length * 0.1)));
  const followIndex = Math.min(frames.length - 1, peakIndex + Math.max(2, Math.round(frames.length * 0.16)));

  return [
    { key: "setup", ...PHASE_COPY.setup, frameIndex: setupIndex },
    { key: "launch", ...PHASE_COPY.launch, frameIndex: launchIndex },
    { key: "contact", ...PHASE_COPY.contact, frameIndex: peakIndex },
    { key: "follow", ...PHASE_COPY.follow, frameIndex: followIndex },
  ];
}

function phaseMetrics(
  phase: PhaseKey,
  frame: PoseFrame,
  setupFrame: PoseFrame,
  handedness: Handedness,
): MetricResult[] {
  const landmarks = frame.landmarks;
  const lead = handedness === "right"
    ? { hip: POSE.leftHip, knee: POSE.leftKnee, ankle: POSE.leftAnkle }
    : { hip: POSE.rightHip, knee: POSE.rightKnee, ankle: POSE.rightAnkle };
  const shoulders = midpoint(landmarks[POSE.leftShoulder], landmarks[POSE.rightShoulder]);
  const hips = midpoint(landmarks[POSE.leftHip], landmarks[POSE.rightHip]);
  const setupHips = midpoint(setupFrame.landmarks[POSE.leftHip], setupFrame.landmarks[POSE.rightHip]);
  const setupNose = setupFrame.landmarks[POSE.nose];
  const currentHeadOffset = {
    ...landmarks[POSE.nose],
    x: landmarks[POSE.nose].x - hips.x,
    y: landmarks[POSE.nose].y - hips.y,
  };
  const setupHeadOffset = { ...setupNose, x: setupNose.x - setupHips.x, y: setupNose.y - setupHips.y };
  const values: Record<MetricKey, number> = {
    leadKnee: angleDegrees(landmarks[lead.hip], landmarks[lead.knee], landmarks[lead.ankle]),
    torsoLean: Math.abs((Math.atan2(shoulders.x - hips.x, hips.y - shoulders.y) * 180) / Math.PI),
    separation: axisAngleDifference(
      lineAngleDegrees(landmarks[POSE.leftShoulder], landmarks[POSE.rightShoulder]),
      lineAngleDegrees(landmarks[POSE.leftHip], landmarks[POSE.rightHip]),
    ),
    headMovement: distance(currentHeadOffset, setupHeadOffset) / torsoScale(setupFrame.landmarks),
  };
  const copy: Record<MetricKey, { label: string; unit: "°" | "torso"; good: string; watch: string }> = {
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

  return (Object.keys(values) as MetricKey[]).map((key) => {
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

function qualityChecks(frames: PoseFrame[], expectedSamples: number): QualityCheck[] {
  if (frames.length === 0) {
    return [{ key: "pose", label: "Person detection", status: "fail", detail: "No full-body pose was found." }];
  }
  const coverage = frames.length / Math.max(expectedSamples, 1);
  const averageConfidence = frames.reduce((sum, frame) => sum + frame.confidence, 0) / frames.length;
  const bodyHeights = frames.map((frame) => {
    const ys = KEY_JOINTS.map((index) => frame.landmarks[index]?.y).filter(Number.isFinite);
    return Math.max(...ys) - Math.min(...ys);
  });
  const bodyHeight = bodyHeights.reduce((sum, value) => sum + value, 0) / bodyHeights.length;
  const clippedRatio = frames.filter((frame) => {
    const points = [frame.landmarks[POSE.nose], frame.landmarks[POSE.leftAnkle], frame.landmarks[POSE.rightAnkle]];
    return points.some((point) => point.x < 0.025 || point.x > 0.975 || point.y < 0.025 || point.y > 0.975);
  }).length / frames.length;
  const firstHip = midpoint(frames[0].landmarks[POSE.leftHip], frames[0].landmarks[POSE.rightHip]);
  const firstWrist = midpoint(frames[0].landmarks[POSE.leftWrist], frames[0].landmarks[POSE.rightWrist]);
  const firstRelativeWrist = { ...firstWrist, x: firstWrist.x - firstHip.x, y: firstWrist.y - firstHip.y };
  const motionSpan = Math.max(...frames.map((frame) => {
    const hip = midpoint(frame.landmarks[POSE.leftHip], frame.landmarks[POSE.rightHip]);
    const wrist = midpoint(frame.landmarks[POSE.leftWrist], frame.landmarks[POSE.rightWrist]);
    const relativeWrist = { ...wrist, x: wrist.x - hip.x, y: wrist.y - hip.y };
    return distance(relativeWrist, firstRelativeWrist) / torsoScale(frame.landmarks);
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
      detail: motionSpan >= 0.48 ? "Enough hand-to-torso motion was captured." : "Record one complete swing from setup through follow-through.",
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
  const phases = detectPhases(frames);
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
      adjustments: ["Retake in landscape with the full body visible from setup through follow-through."],
      disclaimer: "Evidence quality was too low, so SwingLens withheld the mechanics score.",
    };
  }

  const setupFrame = frames[phases[0].frameIndex];
  const phaseResults = phases.map((phase) => {
    const frame = frames[phase.frameIndex];
    const metrics = phaseMetrics(phase.key, frame, setupFrame, handedness);
    return {
      ...phase,
      frame,
      metrics,
      score: Math.round(metrics.reduce((sum, metric) => sum + metric.score, 0) / metrics.length),
    };
  });
  const allMetrics = phaseResults.flatMap((phase) =>
    phase.metrics.map((metric) => ({ ...metric, phaseLabel: phase.label })),
  );
  const sorted = [...allMetrics].sort((a, b) => b.score - a.score);
  const strengths = sorted
    .filter((metric) => metric.status === "good")
    .slice(0, 2)
    .map((metric) => `${metric.phaseLabel}: ${metric.note}`);
  const adjustments = [...allMetrics]
    .sort((a, b) => a.score - b.score)
    .filter((metric) => metric.status === "watch")
    .slice(0, 2)
    .map((metric) => `${metric.phaseLabel}: ${metric.note}`);
  const score = Math.round(phaseResults.reduce((sum, phase) => sum + phase.score, 0) / phaseResults.length);

  return {
    score,
    confidence,
    canCoach: true,
    sampledFrames: expectedSamples,
    durationMs: frames.at(-1)?.timestampMs ?? 0,
    phases: phaseResults,
    quality,
    strengths: strengths.length ? strengths : ["The full-body pose remained stable across the swing."],
    adjustments: adjustments.length ? adjustments : ["No major departure appears against the current prototype ranges."],
    disclaimer: "These are 2D screen-space cues, not medical advice, injury diagnosis, or a replacement for a qualified coach.",
  };
}
