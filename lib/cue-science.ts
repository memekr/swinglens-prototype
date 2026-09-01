import type { MetricKey } from "./types";

export type CueExplainer = {
  key: MetricKey | "prototypeScore";
  title: string;
  unit: string;
  how: string;
  math: string;
  derivedFrom: string;
  why: string;
  hsGood: string;
};

export const CUE_EXPLAINERS: CueExplainer[] = [
  {
    key: "prototypeScore",
    title: "Prototype score",
    unit: "0–100",
    how: "Each cue is scored, those scores average into a checkpoint score, and the four checkpoint scores average into the ring you see.",
    math: "A cue scores 100 if it sits inside its prototype range. If it is outside, the score is about 72 minus a penalty that grows with how far it missed the band (floored at 0). Checkpoint score = mean of that checkpoint’s cues. Prototype score = mean of Trigger, Execution, Impact, and Follow-through.",
    derivedFrom: "lib/analysis.ts (rangeScore, then the mean of phase scores). Ranges are inherited prototype bands, not a published lab standard — they still need coach and dataset validation.",
    why: "It is a single number so you can scan the clip. It is not a grade of the hitter as an athlete, and it is not bat speed or exit velocity.",
    hsGood: "There is no universal high-school target. Read the checkpoints: a high score means the 2D poses sat inside the current prototype bands, not that the swing is “pro ready.”",
  },
  {
    key: "leadKnee",
    title: "Lead-knee angle",
    unit: "degrees (°)",
    how: "Interior angle at the front (pitcher-side) knee: hip-joint → knee → foot. For a right-handed hitter that is the left leg; for a lefty, the right leg.",
    math: "angleDegrees(leadHip, leadKnee, leadFoot) in geometry.ts: two vectors from the knee, then arccos of their dot product, converted to degrees. 180° is a straight leg.",
    derivedFrom: "The 17-point body map in Baseball Resources/body-labeling.md, from MediaPipe’s 33 landmarks. Same idea as the pipeline’s 2D front-knee brace overlay.",
    why: "A firm front leg is the brace that lets rotation travel up the chain instead of leaking into a collapsing knee. That is why coaches watch front-leg posture at plant and contact.",
    hsGood: "Around 150–170° at contact is a common high-school brace. Very bent can mean the front side is collapsing; locked-straight can mean the hitter is stiff rather than stacked.",
  },
  {
    key: "torsoLean",
    title: "Torso lean",
    unit: "degrees (°)",
    how: "How far the torso axis (center hip to the midpoint of the shoulders) tilts off vertical in the camera image.",
    math: "abs(atan2(shoulderMid.x − hip.x, hip.y − shoulderMid.y)) × 180/π. Image y grows downward, so the second argument is hip.y − shoulder.y to treat “up” as toward the head.",
    derivedFrom: "2D screen-space from the same skeleton. This is a view-dependent proxy, not a 3D spine angle from MotionBERT.",
    why: "A quiet, repeatable spine angle keeps the eyes and barrel on a consistent plane. Standing up early or collapsing over the plate shows up here.",
    hsGood: "Consistency matters more than a single number. Large jumps between trigger and impact often mean the posture is changing through the swing.",
  },
  {
    key: "separation",
    title: "Shoulder–hip line gap",
    unit: "degrees (°)",
    how: "The smaller angle between the shoulder line and the hip line as drawn on screen — a 2D stand-in for hip-shoulder separation.",
    math: "axisAngleDifference(lineAngle(leftShoulder, rightShoulder), lineAngle(leftHipJoint, rightHipJoint)). That is min(|θ|, 180° − |θ|), so the undirected line gap is used, not a directed 3D twist.",
    derivedFrom: "2D pose. True hip-shoulder separation needs 3D (this repo’s MotionBERT work). A side-on phone camera under-reads the 3D number.",
    why: "Separation is the “wind-up” between hips and shoulders that stores rotational energy. In 3D, high-school launch is often in a roughly 25–45° band; this 2D gap is only a screen-space hint.",
    hsGood: "Look for the gap to grow into execution/impact rather than staying flat. Treat the degrees as a check, not a Statcast-style measurement.",
  },
  {
    key: "headMovement",
    title: "Relative head travel",
    unit: "torso lengths (×)",
    how: "How far the head moved relative to the pelvis, compared with the Trigger frame, then divided by torso length so camera distance cancels out.",
    math: "headOffset = head − centerHip on this frame and on Trigger. travel = distance(currentOffset, triggerOffset) / torsoScale(trigger). torsoScale is shoulder-midpoint to center hip.",
    derivedFrom: "Same skeleton. Normalizing by torso length is why a closer camera does not automatically look like more head movement.",
    why: "A stable head (moving with the body, not lunging off the ball) helps tracking. A large value can also be camera shake, so read it with the video.",
    hsGood: "Lower is usually better at each checkpoint. The allowed band widens later in the swing because some weight shift is expected.",
  },
  {
    key: "swingPath",
    title: "Swing path shape",
    unit: "roundness ratio (unitless)",
    how: "The midpoint of the two hands is tracked from Impact through Follow-through. That polyline is the honest proxy for barrel path because the bat is not tracked.",
    math: "Chord = straight line from first to last hand-center. Roundness = max perpendicular distance from any hand point to that chord, divided by chord length. Upward ratio = −Δy / chord (image y grows down, so a rising path is negative Δy). A 20-point penalty applies if the path does not rise enough (upward ratio < 0.04).",
    derivedFrom: "User-defined follow-through path in this prototype, scored against a circular, slightly upward reference. Roundness band 0.07–0.55.",
    why: "A slightly upward, arcing finish matches an on-plane barrel (the “Ferris wheel” / south-to-north idea in the hitting notes). A chopped or downhill hand path is a 2D warning, not a measured attack angle.",
    hsGood: "You want a gentle upward arc, not a straight chop and not a huge loop. Remember this is hands, not the sweet spot.",
  },
];
