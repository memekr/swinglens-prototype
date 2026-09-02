import { buildCoaching } from "./coaching";
import { findBallImpactIndex, stabilizeBallTrack } from "./ball-detect";
import {
  distance,
  midpoint,
  torsoScale,
} from "./geometry";
import {
  backspaceMetrics,
  executionMetrics,
  impactMetrics,
  leadJoints,
  pickBackspaceIndex,
  triggerMetrics,
} from "./mechanism";
import { framingCheck, poseFillRatio } from "./framing";
import type {
  AnalysisResult,
  Handedness,
  PhaseDefinition,
  PhaseKey,
  PoseFrame,
  QualityCheck,
  Skeleton,
} from "./types";

/**
 * Four checkpoints from Basic Hitting Mechanism:
 * Trigger/Timing — first move and power position.
 * Execution — front foot lands, then foot, knee, hip, upper body.
 * Backspace — rear-leg / rear-arm coil before the ball.
 * Impact — ball meets the bat (or not found).
 */
const PHASE_COPY: Record<PhaseKey, Pick<PhaseDefinition, "label" | "description">> = {
  trigger: {
    label: "Trigger/Timing",
    description: "The first move that sets rhythm, then the hip-hinge power position",
  },
  execution: {
    label: "Execution",
    description: "Front foot lands, then foot, knee, hip, and the bat",
  },
  backspace: {
    label: "Backspace",
    description: "Rear-leg and rear-arm space after plant, before the ball",
  },
  impact: {
    label: "Impact",
    description: "Ball-bat contact at the front-foot plane — only if the ball is found",
  },
};

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

  const ballImpact = findBallImpactIndex(frames, executionIndex, Math.min(frames.length - 1, impactIndex + 6));
  const contactIndex = ballImpact ?? impactIndex;
  const backspaceIndex = pickBackspaceIndex(frames, executionIndex, contactIndex, handedness);

  return [
    { key: "trigger", ...PHASE_COPY.trigger, frameIndex: triggerIndex },
    { key: "execution", ...PHASE_COPY.execution, frameIndex: executionIndex },
    { key: "backspace", ...PHASE_COPY.backspace, frameIndex: backspaceIndex },
    { key: "impact", ...PHASE_COPY.impact, frameIndex: contactIndex },
  ];
}

function qualityChecks(frames: PoseFrame[], expectedSamples: number): QualityCheck[] {
  if (frames.length === 0) {
    return [{ key: "pose", label: "Person detection", status: "fail", detail: "No full-body pose was found." }];
  }
  const coverage = frames.length / Math.max(expectedSamples, 1);
  const averageConfidence = frames.reduce((sum, frame) => sum + frame.confidence, 0) / frames.length;
  const firstReliable = frames.find((frame) => frame.confidence >= 0.5 && poseFillRatio(frame.landmarks) >= 0.12) ?? frames[0];
  const framing = framingCheck(poseFillRatio(firstReliable.landmarks));
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
    framing,
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
      detail: motionSpan >= 0.48 ? "Enough hand-to-torso motion was captured." : "Record one complete swing from the trigger through contact.",
    },
  ];
}

export function analyzePoseSequence(
  frames: PoseFrame[],
  handedness: Handedness,
  expectedSamples = frames.length,
): AnalysisResult {
  const tracked = stabilizeBallTrack(frames);
  const quality = qualityChecks(tracked, expectedSamples);
  const confidence = tracked.length
    ? tracked.reduce((sum, frame) => sum + frame.confidence, 0) / tracked.length
    : 0;
  const phases = detectPhases(tracked, handedness);
  const canCoach = tracked.length >= 8 && phases.length === 4 && !quality.some((check) => check.status === "fail");

  if (!canCoach) {
    return {
      score: null,
      confidence,
      canCoach: false,
      sampledFrames: expectedSamples,
      durationMs: tracked.at(-1)?.timestampMs ?? 0,
      phases: [],
      quality,
      strengths: [],
      adjustments: ["Retake in landscape with the full body visible from the trigger through contact."],
      disclaimer: "Evidence quality was too low, so SwingLens withheld the mechanics score.",
      ballDetected: false,
    };
  }

  const triggerIndex = phases.find((phase) => phase.key === "trigger")!.frameIndex;
  const executionIndex = phases.find((phase) => phase.key === "execution")!.frameIndex;
  const backspaceIndex = phases.find((phase) => phase.key === "backspace")!.frameIndex;
  const impactIndex = phases.find((phase) => phase.key === "impact")!.frameIndex;
  const ballDetected = findBallImpactIndex(tracked, executionIndex, Math.min(tracked.length - 1, impactIndex + 2)) !== null
    && Boolean(tracked[impactIndex]?.ball);

  const metricsFor = (key: PhaseKey) => {
    if (key === "trigger") return triggerMetrics(tracked, triggerIndex, executionIndex, handedness);
    if (key === "execution") return executionMetrics(tracked, triggerIndex, executionIndex, impactIndex, handedness);
    if (key === "backspace") return backspaceMetrics(tracked, executionIndex, backspaceIndex, handedness);
    return impactMetrics(tracked[impactIndex], handedness, ballDetected);
  };

  const phaseResults = phases.map((phase) => {
    const frame = tracked[phase.frameIndex];
    const metrics = metricsFor(phase.key);
    const scored = phase.key === "impact" && !ballDetected
      ? null
      : Math.round(metrics.reduce((sum, metric) => sum + metric.score, 0) / Math.max(metrics.length, 1));
    return {
      ...phase,
      frame,
      metrics,
      score: scored,
      contactPlaneX: phase.key === "impact" && ballDetected ? frame.landmarks[handedness === "right" ? "leftFoot" : "rightFoot"].x : undefined,
    };
  });

  const { strengths, adjustments } = buildCoaching(phaseResults);
  const numbered = phaseResults.filter((phase) => phase.score !== null) as Array<{ score: number }>;
  const score = numbered.length
    ? Math.round(numbered.reduce((sum, phase) => sum + phase.score, 0) / numbered.length)
    : null;

  return {
    score,
    confidence,
    canCoach: true,
    sampledFrames: expectedSamples,
    durationMs: tracked.at(-1)?.timestampMs ?? 0,
    phases: phaseResults,
    quality,
    strengths,
    adjustments,
    ballDetected,
    disclaimer: ballDetected
      ? "These are 2D screen-space cues, not medical advice or a replacement for a qualified coach. Contact is an on-device ball candidate next to the hands, not a stadium TrackNet measurement."
      : "These are 2D screen-space cues, not medical advice or a replacement for a qualified coach. Ball not detected - no impact can be found.",
  };
}
