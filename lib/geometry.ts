import type { PoseLandmark } from "./types";

export const POSE = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const;

export const SKELETON_CONNECTIONS: Array<[number, number]> = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [15, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28],
];

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

export function torsoScale(landmarks: PoseLandmark[]): number {
  const shoulder = midpoint(landmarks[POSE.leftShoulder], landmarks[POSE.rightShoulder]);
  const hip = midpoint(landmarks[POSE.leftHip], landmarks[POSE.rightHip]);
  return Math.max(distance(shoulder, hip), 1e-4);
}

export function meanVisibility(landmarks: PoseLandmark[], indexes: number[]): number {
  return indexes.reduce((sum, index) => sum + (landmarks[index]?.visibility ?? 0), 0) / indexes.length;
}
