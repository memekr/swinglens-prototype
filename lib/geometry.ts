import type { BodyJoint, PoseLandmark, Skeleton } from "./types";

export function midpoint(a: PoseLandmark, b: PoseLandmark): PoseLandmark {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
    visibility: Math.min(a.visibility, b.visibility),
  };
}

export function distance(a: PoseLandmark, b: PoseLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function angleDegrees(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): number {
  const baX = a.x - b.x;
  const baY = a.y - b.y;
  const bcX = c.x - b.x;
  const bcY = c.y - b.y;
  const denominator = Math.hypot(baX, baY) * Math.hypot(bcX, bcY);
  if (denominator < 1e-8) return Number.NaN;
  const cosine = Math.min(1, Math.max(-1, (baX * bcX + baY * bcY) / denominator));
  return (Math.acos(cosine) * 180) / Math.PI;
}

export function lineAngleDegrees(a: PoseLandmark, b: PoseLandmark): number {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

export function axisAngleDifference(first: number, second: number): number {
  const raw = Math.abs(first - second) % 180;
  return Math.min(raw, 180 - raw);
}

/** Shoulder-line-to-Center-Hip distance. The scale-normalizing unit for every 2D metric. */
export function torsoScale(skeleton: Skeleton): number {
  const shoulders = midpoint(skeleton.leftShoulder, skeleton.rightShoulder);
  return Math.max(distance(shoulders, skeleton.centerHip), 1e-4);
}

export function meanVisibility(skeleton: Skeleton, joints: BodyJoint[]): number {
  return joints.reduce((sum, joint) => sum + (skeleton[joint]?.visibility ?? 0), 0) / joints.length;
}
