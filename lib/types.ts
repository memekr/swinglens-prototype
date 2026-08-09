export type Handedness = "right" | "left";

export type PoseLandmark = {
  x: number;
  y: number;
  z: number;
  visibility: number;
};

export type PoseFrame = {
  timestampMs: number;
  landmarks: PoseLandmark[];
  confidence: number;
  previewDataUrl?: string;
};

export type PhaseKey = "setup" | "launch" | "contact" | "follow";

export type PhaseDefinition = {
  key: PhaseKey;
  label: string;
  description: string;
  frameIndex: number;
};

export type MetricKey = "leadKnee" | "torsoLean" | "separation" | "headMovement";

export type MetricResult = {
  key: MetricKey;
  label: string;
  value: number;
  unit: "°" | "몸통";
  reference: [number, number];
  score: number;
  status: "good" | "watch";
  note: string;
};

export type PhaseResult = PhaseDefinition & {
  frame: PoseFrame;
  metrics: MetricResult[];
  score: number;
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
