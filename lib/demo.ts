import { meanVisibility, midpoint } from "./geometry";
import { CORE_JOINTS } from "./skeleton";
import type { PoseFrame, PoseLandmark, Skeleton } from "./types";

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
    const strideLift = Math.sin(Math.min(t / 0.42, 1) * Math.PI) * 0.045;
    const hipShift = t * 0.055;
    const shoulderTilt = 0.018 + swing * 0.025;
    const hipTilt = swing * 0.014;

    const head = point(0.5 + hipShift * 0.35, 0.12 + load * 0.2);
    const leftShoulder = point(0.42 + hipShift, 0.29 - shoulderTilt);
    const rightShoulder = point(0.59 + hipShift, 0.29 + shoulderTilt);
    const leftHipJoint = point(0.45 + hipShift, 0.54 - hipTilt);
    const rightHipJoint = point(0.57 + hipShift, 0.54 + hipTilt);
    const leftKnee = point(0.37 + hipShift * 0.3, 0.72 - load * 0.4);
    const rightKnee = point(0.61 + hipShift * 0.5, 0.73 + load * 0.3);
    // Lead (front) foot lifts for the trigger/stride, then plants by t≈0.42, well before the swing ramp.
    const leftFoot = point(0.31 + hipShift * 0.2, 0.93 - strideLift);
    const rightFoot = point(0.68 + hipShift * 0.6, 0.93 - strideLift * 0.35);

    // After the swing lands (impact lands around t≈0.55), the hand keeps
    // moving through a follow-through wrap: fast horizontal extension
    // easing into a later vertical rise, so the traced path arcs rather
    // than running in a straight line. Ramped to complete within the
    // ~0.17-of-t follow-through sample window used downstream.
    const followT = Math.max(0, Math.min((t - 0.53) / 0.22, 1));
    const wrapX = -Math.sin(followT * Math.PI * 0.5) * 0.13;
    const wrapY = -(1 - Math.cos(followT * Math.PI * 0.5)) * 0.16;

    const handX = 0.75 - swing * 0.47 + load + wrapX;
    const handY = 0.36 + swing * 0.06 - load + wrapY;
    const leftHand = point(handX - 0.018, handY + 0.012);
    const rightHand = point(handX + 0.025, handY - 0.012);
    const leftElbow = point((leftShoulder.x + handX) / 2 - 0.025, 0.37);
    const rightElbow = point((rightShoulder.x + handX) / 2 + 0.03, 0.39);

    const centerHip = midpoint(leftHipJoint, rightHipJoint);
    const landmarks: Skeleton = {
      head,
      torso: midpoint(midpoint(leftShoulder, rightShoulder), centerHip),
      centerHip,
      leftShoulder,
      rightShoulder,
      leftElbow,
      rightElbow,
      leftHand,
      rightHand,
      leftHipJoint,
      rightHipJoint,
      leftKnee,
      rightKnee,
      leftFoot,
      rightFoot,
    };

    return {
      timestampMs: index * 42,
      landmarks,
      confidence: meanVisibility(landmarks, CORE_JOINTS),
    };
  });
}
