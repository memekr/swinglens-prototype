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
  setup: { label: "셋업", description: "움직임이 커지기 전 기준 자세" },
  launch: { label: "런치", description: "손의 가속이 시작되는 구간" },
  contact: { label: "컨택 후보", description: "손목 속도가 가장 큰 프레임 — 실제 타구 순간은 아님" },
  follow: { label: "팔로스루", description: "최대 손목 속도 이후 감속 구간" },
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
  const copy: Record<MetricKey, { label: string; unit: "°" | "몸통"; good: string; watch: string }> = {
    leadKnee: {
      label: "앞무릎 각도",
      unit: "°",
      good: "앞다리가 단계 참고 범위 안에서 지지하고 있어요.",
      watch: "앞무릎 굽힘을 영상과 함께 확인해 보세요. 카메라 각도에 따라 값이 달라집니다.",
    },
    torsoLean: {
      label: "몸통 기울기",
      unit: "°",
      good: "몸통 기울기가 이 단계의 참고 범위에 있어요.",
      watch: "상체가 너무 세워지거나 무너지지 않는지 확인해 보세요.",
    },
    separation: {
      label: "어깨–골반 선 차이",
      unit: "°",
      good: "2D 화면에서 어깨와 골반 선의 차이가 참고 범위에 있어요.",
      watch: "회전 타이밍을 점검하되, 이 값은 3D 분리각이 아닌 화면상 대리값입니다.",
    },
    headMovement: {
      label: "머리 상대 이동",
      unit: "몸통",
      good: "골반 대비 머리 위치가 비교적 안정적이에요.",
      watch: "골반 기준 머리 이동이 크게 보입니다. 중심 이동과 촬영 흔들림을 함께 확인하세요.",
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
    return [{ key: "pose", label: "사람 인식", status: "fail", detail: "전신 포즈를 찾지 못했습니다." }];
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
      label: "포즈 추적",
      status: coverage >= 0.72 ? "pass" : coverage >= 0.48 ? "warn" : "fail",
      detail: `${Math.round(coverage * 100)}% 프레임에서 전신을 찾았습니다.`,
    },
    {
      key: "confidence",
      label: "관절 선명도",
      status: averageConfidence >= 0.68 ? "pass" : averageConfidence >= 0.5 ? "warn" : "fail",
      detail: `핵심 관절 평균 신뢰도 ${Math.round(averageConfidence * 100)}%입니다.`,
    },
    {
      key: "framing",
      label: "전신 크기",
      status: bodyHeight >= 0.46 && bodyHeight <= 0.94 ? "pass" : bodyHeight >= 0.33 ? "warn" : "fail",
      detail: bodyHeight < 0.46 ? "선수가 화면에서 작습니다. 카메라를 조금 더 가까이 두세요." : "화면 안 전신 크기가 분석에 적절합니다.",
    },
    {
      key: "clipping",
      label: "프레임 여유",
      status: clippedRatio <= 0.08 ? "pass" : clippedRatio <= 0.28 ? "warn" : "fail",
      detail: clippedRatio <= 0.08 ? "머리와 발이 안정적으로 화면 안에 있습니다." : "머리나 발이 잘린 프레임이 있습니다.",
    },
    {
      key: "motion",
      label: "스윙 움직임",
      status: motionSpan >= 0.48 ? "pass" : motionSpan >= 0.28 ? "warn" : "fail",
      detail: motionSpan >= 0.48 ? "손과 몸통의 상대 움직임이 충분히 포착됐습니다." : "한 번의 전체 스윙이 포함되도록 다시 촬영해 주세요.",
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
      adjustments: ["전신이 계속 보이도록 가로 화면에서 다시 촬영하면 코칭 결과를 만들 수 있어요."],
      disclaimer: "신뢰도가 부족해 자세 점수를 만들지 않았습니다.",
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
    strengths: strengths.length ? strengths : ["전신 포즈가 안정적으로 추적됐습니다."],
    adjustments: adjustments.length ? adjustments : ["현재 참고 범위에서는 큰 이탈이 보이지 않습니다."],
    disclaimer: "2D 화면 기반 참고값이며 의료·부상 진단 또는 전문 코치의 판단을 대체하지 않습니다.",
  };
}
