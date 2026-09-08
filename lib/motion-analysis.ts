import { angleDegrees } from "./geometry";
import { getSport, type CameraView, type PracticeGoal, type SportId } from "./sports";
import type { BodyJoint, PoseFrame } from "./types";

export type MotionMetric = { label: string; min: number; max: number; samples: number };
export type MotionSummary = {
  usableFrames: PoseFrame[];
  coverage: number;
  visibility: number;
  canReview: boolean;
  observedFps: number;
  metrics: MotionMetric[];
  warnings: string[];
  recommendations: { title: string; evidence: string; steps: string[] }[];
};
const REQUIRED: BodyJoint[] = ["head", "leftShoulder", "rightShoulder", "centerHip",
  "leftHipJoint", "rightHipJoint", "leftKnee", "rightKnee", "leftFoot", "rightFoot", "leftHand", "rightHand"];
const ANGLES: [string, BodyJoint, BodyJoint, BodyJoint][] = [
  ["Left knee", "leftHipJoint", "leftKnee", "leftFoot"],
  ["Right knee", "rightHipJoint", "rightKnee", "rightFoot"],
  ["Left elbow", "leftShoulder", "leftElbow", "leftHand"],
  ["Right elbow", "rightShoulder", "rightElbow", "rightHand"],
];

/** Descriptive 2D measurements only. Never apply baseball targets to another sport. */
export function analyzeMotion(frames: PoseFrame[], expectedSamples: number, aspectRatio: number,
  sport: SportId, view: CameraView, goal: PracticeGoal): MotionSummary {
  const ordered = [...frames].filter((f) => Number.isFinite(f.timestampMs))
    .sort((a, b) => a.timestampMs - b.timestampMs)
    .filter((f, i, all) => i === 0 || f.timestampMs > all[i - 1].timestampMs);
  const usableFrames = ordered.filter((frame) => REQUIRED.every((joint) => {
    const p = frame.landmarks[joint];
    return p && [p.x, p.y, p.visibility].every(Number.isFinite)
      && p.visibility >= 0.55 && p.x >= 0.01 && p.x <= 0.99 && p.y >= 0.01 && p.y <= 0.99;
  }));
  const coverage = Math.min(1, usableFrames.length / Math.max(1, expectedSamples));
  const visibility = usableFrames.length ? usableFrames.reduce((sum, f) => sum
    + REQUIRED.reduce((n, j) => n + f.landmarks[j].visibility, 0) / REQUIRED.length, 0) / usableFrames.length : 0;
  const gaps = usableFrames.slice(1).map((f, i) => f.timestampMs - usableFrames[i].timestampMs);
  const medianGap = [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)] ?? Infinity;
  const observedFps = Number.isFinite(medianGap) && medianGap > 0 ? 1000 / medianGap : 0;
  const canReview = usableFrames.length >= 8 && coverage >= 0.6 && visibility >= 0.65;
  const aspect = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;
  const metrics = ANGLES.flatMap(([label, ...joints]) => {
    const values = usableFrames.flatMap((f) => {
      if (joints.some((j) => f.landmarks[j].visibility < 0.65)) return [];
      const points = joints.map((j) => ({ ...f.landmarks[j], x: f.landmarks[j].x * aspect }));
      const value = angleDegrees(points[0], points[1], points[2]);
      return Number.isFinite(value) ? [value] : [];
    });
    return canReview && values.length >= 8 ? [{ label, min: Math.min(...values), max: Math.max(...values), samples: values.length }] : [];
  });
  const warnings: string[] = [];
  if (!canReview) warnings.push("Retake: too few reliable full-body observations. Technique recommendations are withheld.");
  if (observedFps < 24) warnings.push("Sparse observed frames: fast transitions may be missing. Interpolation does not recover them.");
  if (gaps.some((gap) => gap > 150)) warnings.push("Tracking gaps exceed 150 ms. Do not infer continuous motion across these gaps.");
  if (view === "oblique") warnings.push("Oblique view changes projected angles. Compare only clips from the same camera position.");
  warnings.push(getSport(sport).limitation);
  const recommendation = goal === "timing"
    ? { title: "Review the sequence", evidence: `${observedFps.toFixed(1)} usable observations/s; event timings are not automatically labeled.`,
      steps: ["Mark a start and an action checkpoint yourself.", "Step through only observed frames between them.", "Compare the order, not speed or contact timing, with a second attempt."] }
    : goal === "control"
      ? { title: "Compare the return", evidence: "The report describes visible positions, not strength, stability or injury risk.",
        steps: ["Choose a start frame and a finish frame.", "Compare the visible body positions from the same view.", "Record another comfortable repetition with the same framing."] }
      : { title: "Build a repeatable comparison", evidence: `${usableFrames.length} reliable full-body frames available; no universal ideal posture is assumed.`,
        steps: getSport(sport).review };
  return { usableFrames, coverage, visibility, canReview, observedFps, metrics, warnings,
    recommendations: canReview ? [recommendation] : [] };
}
