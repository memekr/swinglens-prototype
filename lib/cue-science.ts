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
    how: "Each mechanism cue is scored, those scores average into a checkpoint, and Trigger/Timing, Execution, and Backspace average into the ring. Impact is left out of the ring when the ball is not found.",
    math: "A cue scores near 100 when the 2D read matches the hitting-note pattern (hip hinge, chain order, rear-side space, front-foot contact). Watch items score lower. Checkpoint score = mean of that tab’s cues.",
    derivedFrom: "Basic Hitting Mechanism.md and Contact Point.md, applied to the on-device skeleton in lib/mechanism.ts.",
    why: "It is a scan number for this clip, not bat speed, exit velocity, or a grade of the athlete.",
    hsGood: "Read the four tabs. A high ring means the poses matched the current mechanism checks, not that the swing is finished.",
  },
  {
    key: "triggerStyle",
    title: "Trigger variation",
    unit: "style tag",
    how: "The first part of the clip is scored for front-foot lift, foot tap, and hand motion relative to the hips.",
    math: "Lead-foot lift is (startY − minY) / torso length. Large kick ≥ 0.22 torso. Toe tap is a small lift (~0.03–0.08). Bat wiggle is hands moving more than the feet. Foot tap is a small y wobble with almost no lift.",
    derivedFrom: "Basic Hitting Mechanism.md: wiggle the bat, tap a foot, no leg kick, or a large leg kick.",
    why: "The trigger only sets rhythm. Power still has to load into the rear hip.",
    hsGood: "Any of those four is legal. The miss is rushing from a tall, quad-dominant stance with no hip hinge.",
  },
  {
    key: "hipHinge",
    title: "Power position / hip hinge",
    unit: "pattern",
    how: "From stance to trigger, we watch whether the rear hip moves back while the knees only bend a little.",
    math: "Rear-hip distance from the lead foot, hip-to-feet depth, and rear-knee angle versus the first frame. Knees sliding forward without the hip going back is tagged quad-dominant.",
    derivedFrom: "Launch / power position: glute and hamstring load. Pull the rear hip toward the dugout behind you.",
    why: "The hinge lets the hip rotate. Bending only at the knees puts the load on the quads and usually leaks the swing.",
    hsGood: "A slight knee bend plus a visible sit into the rear hip. Not a deep squat, not standing straight up.",
  },
  {
    key: "scapLoad",
    title: "Rear scapula",
    unit: "pattern",
    how: "Whether the rear elbow stays behind the rear shoulder as you load.",
    math: "Signed rear-shoulder minus rear-elbow along the stance axis (lead foot minus rear foot), compared with the first frame.",
    derivedFrom: "Keep the rear scapula engaged on the back side so the hands do not drift out.",
    why: "If the scap dumps, the barrel starts from the hands instead of from the coil.",
    hsGood: "Rear elbow organized behind the rear shoulder at trigger, not floating toward the pitcher.",
  },
  {
    key: "landingStyle",
    title: "Landing (stride vs toe tap)",
    unit: "pattern",
    how: "Execution starts when the front foot is on the ground. We separate a stride, a leg-kick landing, and a toe tap.",
    math: "Max lead-foot lift before plant, and how far that foot traveled in x. Small lift and small stride = toe tap.",
    derivedFrom: "Basic Hitting Mechanism.md execution: the front leg lands. If there is no kick, it is a toe tap.",
    why: "You can hit from a toe tap, but you still have to land before you turn.",
    hsGood: "The front foot is down before the barrel is committed. Either style is fine if the chain still goes ground-up.",
  },
  {
    key: "chainFoot",
    title: "Kinetic chain order",
    unit: "sequence",
    how: "After plant we mark when the foot line, lead knee, hip line, and hands/shoulders each take off.",
    math: "Each series is measured from the plant frame. 'In sequence' means first crossing of 32% of that series’ peak happens in order: foot, knee, hip, upper body.",
    derivedFrom: "Foot turns, then knee, then hip, then the bat.",
    why: "If the upper body wins the race, the barrel is pushed instead of rotated.",
    hsGood: "You should see the front foot down, then the foot and knee, then the pelvis, then the bat. Not the reverse.",
  },
  {
    key: "backspace",
    title: "Backspace",
    unit: "pattern",
    how: "After plant and before contact, whether the rear elbow and rear hip still have room.",
    math: "Rear-elbow to torso (in torso lengths) and whether center hip is still closer to the rear foot than the lead foot, plus the 2D shoulder–hip line gap.",
    derivedFrom: "About 80% of the swing happens in this coil. Soto holding the back-leg axis is the picture.",
    why: "Emptying the rear side early is how hitters lunge and lose torque.",
    hsGood: "Rear elbow still back, pelvis not dumped onto the front foot, some visible twist between hips and shoulders.",
  },
  {
    key: "deliveryStyle",
    title: "Delivery (rear axis vs transfer)",
    unit: "pattern",
    how: "Whether energy stays on the rear leg while you twist, or the hips race onto the front foot.",
    math: "Rear-foot vs lead-foot distance from center hip, and how much that hip moved toward the lead foot after plant.",
    derivedFrom: "Forward transfer (Alvarez) vs rotating on the back-leg axis (Harper, Judge, Ohtani).",
    why: "Home-run patterns often hold the rear axis. An early dump onto the front side is the miss for most high-school hitters.",
    hsGood: "You can transfer, but the rear hip should still be under you when the torso starts to turn.",
  },
  {
    key: "ballContact",
    title: "Ball detection",
    unit: "found / not found",
    how: "Each still is scanned for a small bright baseball away from the torso, then tracked if it moves toward the hands.",
    math: "Downsampled luminance blobs, stitched if they move, impact = closest ball-to-hands sample after plant. If that never happens: “Ball not detected - no impact can be found.”",
    derivedFrom: "On-device canvas vision. Not TrackNet. A 30 fps blurry cage clip will often miss.",
    why: "Impact is defined as bat-ball contact. Without the ball we will not fake a contact frame.",
    hsGood: "60 fps, bright light, ball in frame from release to contact.",
  },
  {
    key: "contactPlane",
    title: "Front-foot contact plane",
    unit: "torso lengths along the stride",
    how: "When the ball is found, we project it onto the line from rear foot to front foot and compare with the front foot.",
    math: "offset = dot(ball − leadFoot, strideAxis). Near 0 is the plane. Positive is out in front. Negative is too deep.",
    derivedFrom: "Contact Point.md: one window up from the front foot, three barrel directions. Not a dump onto the front leg.",
    why: "Reaching out front hooks. Waiting too deep is late at real velocity.",
    hsGood: "Meet the ball near that front-foot line, stay balanced, drive through the window.",
  },
];
