import { POSE, meanVisibility } from "./geometry";
import type { PoseFrame, PoseLandmark } from "./types";

function point(x: number, y: number, visibility = 0.98): PoseLandmark {
  return { x, y, z: 0, visibility };
}

function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

export function createDemoFrames(count = 48): PoseFrame[] {
  return Array.from({ length: count }, (_, index) => {
    const t = index / (count - 1);
    const swing = sigmoid((t - 0.56) * 18);
    const load = Math.sin(Math.min(t / 0.5, 1) * Math.PI) * 0.035;
    const hipShift = t * 0.055;
    const landmarks = Array.from({ length: 33 }, () => point(0.5, 0.5, 0.96));
    const shoulderTilt = 0.018 + swing * 0.025;
    const hipTilt = swing * 0.014;

    landmarks[POSE.nose] = point(0.5 + hipShift * 0.35, 0.12 + load * 0.2);
    landmarks[7] = point(0.47 + hipShift * 0.35, 0.14);
    landmarks[8] = point(0.53 + hipShift * 0.35, 0.14);
    landmarks[POSE.leftShoulder] = point(0.42 + hipShift, 0.29 - shoulderTilt);
    landmarks[POSE.rightShoulder] = point(0.59 + hipShift, 0.29 + shoulderTilt);
    landmarks[POSE.leftHip] = point(0.45 + hipShift, 0.54 - hipTilt);
    landmarks[POSE.rightHip] = point(0.57 + hipShift, 0.54 + hipTilt);
    landmarks[POSE.leftKnee] = point(0.37 + hipShift * 0.3, 0.72 - load * 0.4);
    landmarks[POSE.rightKnee] = point(0.61 + hipShift * 0.5, 0.73 + load * 0.3);
    landmarks[POSE.leftAnkle] = point(0.31 + hipShift * 0.2, 0.93);
    landmarks[POSE.rightAnkle] = point(0.68 + hipShift * 0.6, 0.93);

    const wristX = 0.75 - swing * 0.47 + load;
    const wristY = 0.36 + swing * 0.06 - load;
    landmarks[POSE.leftWrist] = point(wristX - 0.018, wristY + 0.012);
    landmarks[POSE.rightWrist] = point(wristX + 0.025, wristY - 0.012);
    landmarks[POSE.leftElbow] = point((landmarks[POSE.leftShoulder].x + wristX) / 2 - 0.025, 0.37);
    landmarks[POSE.rightElbow] = point((landmarks[POSE.rightShoulder].x + wristX) / 2 + 0.03, 0.39);

    return {
      timestampMs: index * 42,
      landmarks,
      confidence: meanVisibility(landmarks, [0, 11, 12, 15, 16, 23, 24, 25, 26, 27, 28]),
    };
  });
}
