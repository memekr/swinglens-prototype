import { midpoint } from "./geometry";
import type { BodyJoint, PoseLandmark, Skeleton } from "./types";

/**
 * Source of truth: Baseball Resources/body-labeling.md
 * 1 Head, 2 N/A, 3 Torso, 4 N/A, 5 Center Hip, 6 Left shoulder, 7 Right
 * shoulder, 8 Left elbow, 9 Right elbow, 10 Left hand, 11 Right hand,
 * 12 Left hip-joint, 13 Right hip-joint, 14 Left knee, 15 Right knee,
 * 16 Left foot, 17 Right foot. Slots 2 and 4 are reserved/unused in the doc.
 */
export const BODY_LABELS: Record<BodyJoint, string> = {
  head: "Head",
  torso: "Torso",
  centerHip: "Center hip",
  leftShoulder: "Left shoulder",
  rightShoulder: "Right shoulder",
  leftElbow: "Left elbow",
  rightElbow: "Right elbow",
  leftHand: "Left hand",
  rightHand: "Right hand",
  leftHipJoint: "Left hip-joint",
  rightHipJoint: "Right hip-joint",
  leftKnee: "Left knee",
  rightKnee: "Right knee",
  leftFoot: "Left foot",
  rightFoot: "Right foot",
};

/** MediaPipe Pose Landmarker (33-point) index for each directly-mapped joint. */
const MEDIAPIPE_INDEX: Partial<Record<BodyJoint, number>> = {
  head: 0, // nose
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftHand: 15, // wrist
  rightHand: 16,
  leftHipJoint: 23,
  rightHipJoint: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftFoot: 27, // ankle
  rightFoot: 28,
};

/** The 11 joints with reliable per-frame MediaPipe visibility. Used for capture-confidence checks. */
export const CORE_JOINTS: BodyJoint[] = [
  "head",
  "leftShoulder",
  "rightShoulder",
  "leftHand",
  "rightHand",
  "leftHipJoint",
  "rightHipJoint",
  "leftKnee",
  "rightKnee",
  "leftFoot",
  "rightFoot",
];

/**
 * Converts a raw 33-point MediaPipe detection into this project's
 * body-labeling skeleton. Torso and Center Hip aren't native MediaPipe
 * landmarks, so they're derived: Center Hip is the hip midpoint, Torso is
 * the midpoint between the shoulder line and Center Hip (the trunk center).
 */
export function toSkeleton(raw: PoseLandmark[]): Skeleton {
  const at = (joint: BodyJoint): PoseLandmark => raw[MEDIAPIPE_INDEX[joint]!];
  const leftShoulder = at("leftShoulder");
  const rightShoulder = at("rightShoulder");
  const leftHipJoint = at("leftHipJoint");
  const rightHipJoint = at("rightHipJoint");
  const centerHip = midpoint(leftHipJoint, rightHipJoint);
  return {
    head: at("head"),
    torso: midpoint(midpoint(leftShoulder, rightShoulder), centerHip),
    centerHip,
    leftShoulder,
    rightShoulder,
    leftElbow: at("leftElbow"),
    rightElbow: at("rightElbow"),
    leftHand: at("leftHand"),
    rightHand: at("rightHand"),
    leftHipJoint,
    rightHipJoint,
    leftKnee: at("leftKnee"),
    rightKnee: at("rightKnee"),
    leftFoot: at("leftFoot"),
    rightFoot: at("rightFoot"),
  };
}

/** Bones to draw between canonical joints, spine-first. */
export const SKELETON_CONNECTIONS: Array<[BodyJoint, BodyJoint]> = [
  ["head", "torso"],
  ["torso", "centerHip"],
  ["torso", "leftShoulder"],
  ["torso", "rightShoulder"],
  ["leftShoulder", "rightShoulder"],
  ["leftShoulder", "leftElbow"],
  ["leftElbow", "leftHand"],
  ["rightShoulder", "rightElbow"],
  ["rightElbow", "rightHand"],
  ["centerHip", "leftHipJoint"],
  ["centerHip", "rightHipJoint"],
  ["leftHipJoint", "rightHipJoint"],
  ["leftHipJoint", "leftKnee"],
  ["leftKnee", "leftFoot"],
  ["rightHipJoint", "rightKnee"],
  ["rightKnee", "rightFoot"],
];

export const SKELETON_POINTS: BodyJoint[] = [
  "head",
  "torso",
  "centerHip",
  "leftShoulder",
  "rightShoulder",
  "leftElbow",
  "rightElbow",
  "leftHand",
  "rightHand",
  "leftHipJoint",
  "rightHipJoint",
  "leftKnee",
  "rightKnee",
  "leftFoot",
  "rightFoot",
];

/** Drawn larger: the points that matter most for a bat swing. */
export const EMPHASIZED_POINTS: BodyJoint[] = ["leftHand", "rightHand"];
