export type Handedness = "right" | "left";

export type PoseLandmark = {
  x: number;
  y: number;
  z: number;
  visibility: number;
};

/**
 * Canonical body labeling for this project, from
 * `Baseball Resources/body-labeling.md`: Head, Torso, Center Hip, L/R
 * shoulder, elbow, hand, hip-joint, knee, foot. Every landmark-consuming
 * module (analysis, drills, rendering) reads joints by these names instead
 * of raw MediaPipe indices.
 */
export type BodyJoint =
  | "head"
  | "torso"
  | "centerHip"
  | "leftShoulder"
  | "rightShoulder"
  | "leftElbow"
  | "rightElbow"
  | "leftHand"
  | "rightHand"
  | "leftHipJoint"
  | "rightHipJoint"
  | "leftKnee"
  | "rightKnee"
  | "leftFoot"
  | "rightFoot";

export type Skeleton = Record<BodyJoint, PoseLandmark>;

export type PoseFrame = {
  timestampMs: number;
  landmarks: Skeleton;
  confidence: number;
  previewDataUrl?: string;
};

export type PhaseKey = "trigger" | "execution" | "impact" | "follow";

export type PhaseDefinition = {
  key: PhaseKey;
  label: string;
  description: string;
  frameIndex: number;
};

/** The four cues computed identically at every checkpoint. */
export type CoreMetricKey = "leadKnee" | "torsoLean" | "separation" | "headMovement";

/** Core cues plus the follow-through-only swing-path cue. */
export type MetricKey = CoreMetricKey | "swingPath";

export type MetricUnit = "°" | "torso" | "ratio";

export type MetricResult = {
  key: MetricKey;
  label: string;
  value: number;
  unit: MetricUnit;
  reference: [number, number];
  score: number;
  status: "good" | "watch";
  note: string;
};

/**
 * The tracked hand path from Impact through Follow-through: the app's
 * honest proxy for the bat barrel path, since the bat itself isn't tracked.
 */
export type SwingPath = {
  points: PoseLandmark[];
  upwardRatio: number;
  roundness: number;
  status: "good" | "watch";
  note: string;
};

export type PhaseResult = PhaseDefinition & {
  frame: PoseFrame;
  metrics: MetricResult[];
  score: number;
  swingPath?: SwingPath;
};

export type QualityCheck = {
  key: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
};

export type AnalysisResult = {
  score: number | null;
  confidence: number;
  canCoach: boolean;
  sampledFrames: number;
  durationMs: number;
  phases: PhaseResult[];
  quality: QualityCheck[];
  strengths: string[];
  adjustments: string[];
  disclaimer: string;
};
