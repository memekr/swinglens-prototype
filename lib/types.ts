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

export type BallSpot = {
  x: number;
  y: number;
  score: number;
  trackId?: number;
};

export type PoseFrame = {
  timestampMs: number;
  landmarks: Skeleton;
  confidence: number;
  previewDataUrl?: string;
  /** Normalized image coords if a baseball candidate was found on this still. */
  ball?: BallSpot | null;
  /** Neural bat proposal, not an inferred wrist line or a barrel endpoint. */
  batBox?: { x: number; y: number; width: number; height: number } | null;
};

export type PhaseKey = "trigger" | "execution" | "backspace" | "impact";

export type PhaseDefinition = {
  key: PhaseKey;
  label: string;
  description: string;
  frameIndex: number;
};

/** Shared 2D geometry cues. */
export type CoreMetricKey = "leadKnee" | "torsoLean" | "separation" | "headMovement";

export type MetricKey =
  | CoreMetricKey
  | "triggerStyle"
  | "hipHinge"
  | "scapLoad"
  | "landingStyle"
  | "chainLand"
  | "chainFoot"
  | "chainKnee"
  | "chainHip"
  | "chainUpper"
  | "backspace"
  | "deliveryStyle"
  | "ballContact"
  | "contactPlane";

export type MetricUnit = "°" | "torso" | "ratio" | "cue";

export type MetricResult = {
  key: MetricKey;
  label: string;
  value: number;
  unit: MetricUnit;
  reference: [number, number];
  score: number;
  status: "good" | "watch";
  note: string;
  /** Short tag shown instead of a number (trigger style, delivery, and so on). */
  display?: string;
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
  score: number | null;
  swingPath?: SwingPath;
  /** Vertical contact-plane x in normalized image coords (front foot). */
  contactPlaneX?: number;
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
  ballDetected: boolean;
};
