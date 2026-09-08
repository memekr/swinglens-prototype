import {
  angleDegrees,
  axisAngleDifference,
  distance,
  lineAngleDegrees,
  midpoint,
  torsoScale,
} from "./geometry";
import type { BodyJoint, Handedness, MetricResult, PoseFrame } from "./types";

export function leadJoints(handedness: Handedness): { hip: BodyJoint; knee: BodyJoint; foot: BodyJoint; shoulder: BodyJoint; elbow: BodyJoint; hand: BodyJoint } {
  return handedness === "right"
    ? { hip: "leftHipJoint", knee: "leftKnee", foot: "leftFoot", shoulder: "leftShoulder", elbow: "leftElbow", hand: "leftHand" }
    : { hip: "rightHipJoint", knee: "rightKnee", foot: "rightFoot", shoulder: "rightShoulder", elbow: "rightElbow", hand: "rightHand" };
}

export function rearJoints(handedness: Handedness) {
  return handedness === "right"
    ? { hip: "rightHipJoint" as const, knee: "rightKnee" as const, foot: "rightFoot" as const, shoulder: "rightShoulder" as const, elbow: "rightElbow" as const, hand: "rightHand" as const }
    : { hip: "leftHipJoint" as const, knee: "leftKnee" as const, foot: "leftFoot" as const, shoulder: "leftShoulder" as const, elbow: "leftElbow" as const, hand: "leftHand" as const };
}

function cue(
  key: MetricResult["key"],
  label: string,
  display: string,
  score: number,
  good: boolean,
  note: string,
  value = score,
): MetricResult {
  return {
    key,
    label,
    value,
    unit: "cue",
    reference: [70, 100],
    score,
    status: good ? "good" : "watch",
    note,
    display,
  };
}

function firstCrossing(values: number[], fraction = 0.32): number {
  const peak = Math.max(...values, 1e-6);
  const threshold = peak * fraction;
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] >= threshold) return index;
  }
  return values.length - 1;
}

/** Trigger variation + power position + scap load from the first part of the clip. */
export function triggerMetrics(frames: PoseFrame[], triggerIndex: number, executionIndex: number, handedness: Handedness): MetricResult[] {
  const lead = leadJoints(handedness);
  const rear = rearJoints(handedness);
  const origin = frames[0].landmarks;
  const trigger = frames[triggerIndex].landmarks;
  const scale = torsoScale(origin);
  const end = Math.max(triggerIndex + 1, Math.min(executionIndex, frames.length - 1));
  const early = frames.slice(0, end);

  const lifts = early.map((frame) => Math.max(0, origin[lead.foot].y - frame.landmarks[lead.foot].y) / scale);
  const maxLift = Math.max(...lifts, 0);
  const handTravel = early.map((frame, index) => {
    if (index === 0) return 0;
    return distance(
      midpoint(frame.landmarks.leftHand, frame.landmarks.rightHand),
      midpoint(early[index - 1].landmarks.leftHand, early[index - 1].landmarks.rightHand),
    ) / scale;
  });
  const footWobble = early.map((frame, index) => {
    if (index === 0) return 0;
    return Math.abs(frame.landmarks[lead.foot].y - early[index - 1].landmarks[lead.foot].y) / scale;
  });
  const meanHand = handTravel.reduce((sum, value) => sum + value, 0) / Math.max(handTravel.length, 1);
  const meanFoot = footWobble.reduce((sum, value) => sum + value, 0) / Math.max(footWobble.length, 1);
  const towardRear = Math.max(
    0,
    ...early.map((frame) => (distance(origin[lead.foot], origin[rear.foot]) - distance(frame.landmarks[lead.foot], frame.landmarks[rear.foot])) / scale),
  );

  let style = "No leg kick";
  let styleNote =
    "The front foot stays near the ground through the first move. Rhythm is coming from the hands or a quiet lower half, not a stride.";
  let styleScore = 78;
  if (maxLift >= 0.22) {
    style = "Large leg kick";
    styleNote =
      "The front knee lifts high before the swing. That is a large-leg-kick trigger. Land on time, then turn. A late, heavy landing will rush the barrel.";
    styleScore = 86;
  } else if (maxLift >= 0.08 && towardRear > 0.04) {
    style = "Leg kick";
    styleNote =
      "The front leg loads back toward the rear leg, then goes out. That is a stride trigger, not a toe tap.";
    styleScore = 88;
  } else if (maxLift >= 0.03 && maxLift < 0.08) {
    style = "Toe tap";
    styleNote =
      "The front foot leaves the ground only a little and stays near its start. That is a toe-tap trigger, not a leg kick. Timing still has to land the front side before the turn.";
    styleScore = 84;
  } else if (meanFoot > meanHand * 0.85 && meanFoot > 0.012 && maxLift < 0.05) {
    style = "Foot tap";
    styleNote =
      "The front foot is tapping the ground to keep rhythm, with almost no knee lift. Keep the tap small so it does not become a sway off the rear hip.";
    styleScore = 82;
  } else if (meanHand > 0.018 && meanHand > meanFoot * 1.4) {
    style = "Bat wiggle";
    styleNote =
      "The hands move more than the feet in the first part of the clip. That is a bat-wiggle trigger. The lower body still needs a quiet hip hinge before you go.";
    styleScore = 80;
  }

  const originBase = midpoint(origin.leftFoot, origin.rightFoot);
  const triggerBase = midpoint(trigger.leftFoot, trigger.rightFoot);
  const originSeat = distance(origin.centerHip, originBase) / scale;
  const triggerSeat = distance(trigger.centerHip, triggerBase) / scale;
  const rearHipBack = (distance(trigger[rear.hip], trigger[lead.foot]) - distance(origin[rear.hip], origin[lead.foot])) / scale;
  const originKnee = angleDegrees(origin[rear.hip], origin[rear.knee], origin[rear.foot]);
  const triggerKnee = angleDegrees(trigger[rear.hip], trigger[rear.knee], trigger[rear.foot]);
  const kneeOnly = originKnee - triggerKnee;
  const hinged = rearHipBack > 0.02 && triggerSeat >= originSeat - 0.02 && kneeOnly < 28;
  const quad = kneeOnly > 18 && rearHipBack < 0.015;

  const hinge = hinged
    ? cue(
        "hipHinge",
        "Power position",
        "Hip hinge",
        92,
        true,
        "Into the trigger you sit the rear hip back (glute and hamstring) with only a slight knee bend. That is the launch / power position: balanced on the rear hip, not a squat that dumps into the quads.",
      )
    : cue(
        "hipHinge",
        "Power position",
        quad ? "Quad-dominant" : "Tall / light load",
        quad ? 48 : 62,
        false,
        quad
          ? "The knees are sliding forward more than the hips are moving back. That is quad-dominant. Hinge: move the rear hip toward the dugout behind you, keep a slight knee bend, and feel the hamstring. Standing tall and pushing the knees forward will not load the hip."
          : "The rear hip is not clearly sitting back into the hamstring. Before the stride, hinge at the hip so the glute can stabilize and rotate. A small knee bend is enough. Pull the rear hip back rather than dipping the chest.",
      );

  const leadDir = Math.sign(origin[lead.foot].x - origin[rear.foot].x) || 1;
  const originScap = (origin[rear.shoulder].x - origin[rear.elbow].x) * leadDir;
  const triggerScap = (trigger[rear.shoulder].x - trigger[rear.elbow].x) * leadDir;
  const scapGain = (triggerScap - originScap) / scale;
  const scap = scapGain > 0.01
    ? cue(
        "scapLoad",
        "Rear scapula",
        "Loaded",
        88,
        true,
        "The rear elbow stays organized behind the rear shoulder. The scapula is still engaged on the back side, so the barrel can stay connected instead of drifting forward early.",
      )
    : cue(
        "scapLoad",
        "Rear scapula",
        "Not loaded",
        55,
        false,
        "The rear shoulder blade is not clearly pulling back. Load the rear scapula: keep the rear elbow and shoulder blade on the back side while the hip hinges. If the scap dumps, the hands start the swing.",
      );

  return [
    cue("triggerStyle", "Trigger variation", style, styleScore, styleScore >= 78, styleNote),
    hinge,
    scap,
  ];
}

/** Landing style plus foot → knee → hip → upper-body order after plant. */
export function executionMetrics(
  frames: PoseFrame[],
  triggerIndex: number,
  executionIndex: number,
  impactIndex: number,
  handedness: Handedness,
): MetricResult[] {
  const lead = leadJoints(handedness);
  const rear = rearJoints(handedness);
  const origin = frames[0].landmarks;
  const plant = frames[executionIndex].landmarks;
  const scale = torsoScale(plant);
  const preLift = Math.max(
    0,
    ...frames.slice(0, executionIndex + 1).map((frame) => (origin[lead.foot].y - frame.landmarks[lead.foot].y) / scale),
  );
  const stride = Math.abs(plant[lead.foot].x - origin[lead.foot].x) / scale;
  const pulledIn = distance(origin[lead.foot], origin[rear.foot]) - distance(plant[lead.foot], plant[rear.foot]);

  let landing = "Stride landing";
  let landingNote = "The front foot travels forward and plants. Execution starts at that landing. Turn after you land, not as you are still reaching the foot out.";
  let landingScore = 86;
  if (preLift < 0.07 && stride < 0.12) {
    landing = "Toe tap";
    landingNote =
      "The front foot never really left for a kick, and it does not stride out. That is a toe-tap landing. You can still go foot → knee → hip → torso, but there is less time to get the front side down. Do not skip the plant and spin from the upper body.";
    landingScore = 80;
  } else if (preLift >= 0.18) {
    landing = "Leg-kick landing";
    landingNote =
      "The front leg came up, then down. Execution starts when that foot is on the ground. If the heel is still in the air, you are not in execution yet.";
    landingScore = 88;
  } else if (pulledIn > 0.03 * scale && stride < 0.1) {
    landing = "Toe tap (front to rear)";
    landingNote =
      "The front foot came back toward the rear leg instead of a stride. Treat that as a toe tap. Land it, then rotate in order.";
    landingScore = 82;
  }

  const from = executionIndex;
  const to = Math.max(executionIndex + 2, Math.min(impactIndex, frames.length - 1));
  const window = frames.slice(from, to + 1);
  if (window.length < 3) {
    return [
      cue("landingStyle", "How you landed", landing, landingScore, landingScore >= 80, landingNote),
      cue("chainLand", "1. Front foot lands", "At this frame", 90, true, "This still is the plant sample. Execution begins here."),
      cue("chainFoot", "2. Foot turns", "Needs more samples", 60, false, "Not enough frames after plant to read the turn order."),
      cue("chainKnee", "3. Knee follows", "Needs more samples", 60, false, "Not enough frames after plant to read the knee."),
      cue("chainHip", "4. Hip / pelvis", "Needs more samples", 60, false, "Not enough frames after plant to read the hip."),
      cue("chainUpper", "5. Upper body / bat", "Needs more samples", 60, false, "Not enough frames after plant to read the barrel."),
    ];
  }

  const plantAngle = lineAngleDegrees(plant[lead.foot], plant[lead.knee]);
  const plantHip = lineAngleDegrees(plant.leftHipJoint, plant.rightHipJoint);
  const plantShoulder = lineAngleDegrees(plant.leftShoulder, plant.rightShoulder);
  const plantHands = midpoint(plant.leftHand, plant.rightHand);

  const footSeries = window.map((frame) => axisAngleDifference(lineAngleDegrees(frame.landmarks[lead.foot], frame.landmarks[lead.knee]), plantAngle));
  const kneeSeries = window.map((frame) => Math.abs(frame.landmarks[lead.knee].x - plant[lead.knee].x) / scale);
  const hipSeries = window.map((frame) => axisAngleDifference(lineAngleDegrees(frame.landmarks.leftHipJoint, frame.landmarks.rightHipJoint), plantHip));
  const upperSeries = window.map((frame) => {
    const shoulder = axisAngleDifference(lineAngleDegrees(frame.landmarks.leftShoulder, frame.landmarks.rightShoulder), plantShoulder);
    const hands = distance(midpoint(frame.landmarks.leftHand, frame.landmarks.rightHand), plantHands) / scale;
    return shoulder / 25 + hands;
  });

  const order = {
    foot: firstCrossing(footSeries),
    knee: firstCrossing(kneeSeries),
    hip: firstCrossing(hipSeries),
    upper: firstCrossing(upperSeries),
  };
  const sequenced = order.foot <= order.knee && order.knee <= order.hip && order.hip <= order.upper;
  const stepNote = (name: string, index: number, nextOk: boolean, copy: string) =>
    cue(
      name as MetricResult["key"],
      copy,
      nextOk ? "In sequence" : "Out of order",
      nextOk ? 90 : 58,
      nextOk,
      nextOk
        ? `This piece turns about ${(index / Math.max(window.length - 1, 1) * 100).toFixed(0)}% of the way from plant toward contact, in the ground-up order.`
        : `This piece is not waiting its turn. The chain should be: front foot lands, foot turns, knee, hip/pelvis, then the upper body and bat. Fix the earlier link before you throw the barrel.`,
    );

  return [
    cue("landingStyle", "How you landed", landing, landingScore, landingScore >= 80, landingNote),
    cue("chainLand", "1. Front foot lands", "Plant", 94, true, "Execution starts when the front foot is on the ground. The still on the left is that landing."),
    stepNote("chainFoot", order.foot, order.foot <= order.knee, "2. Foot turns"),
    stepNote("chainKnee", order.knee, order.knee <= order.hip && order.foot <= order.knee, "3. Knee follows"),
    stepNote("chainHip", order.hip, order.hip <= order.upper && order.knee <= order.hip, "4. Hip / pelvis rotation"),
    stepNote(
      "chainUpper",
      order.upper,
      sequenced,
      "5. Upper body (bat swings)",
    ),
  ];
}

/** Rear-leg / rear-arm space after plant, before the ball. */
export function backspaceMetrics(
  frames: PoseFrame[],
  executionIndex: number,
  backspaceIndex: number,
  handedness: Handedness,
): MetricResult[] {
  const lead = leadJoints(handedness);
  const rear = rearJoints(handedness);
  const plant = frames[executionIndex].landmarks;
  const now = frames[backspaceIndex].landmarks;
  const scale = torsoScale(now);
  const rearArm = distance(now[rear.elbow], now.torso) / scale;
  const plantArm = distance(plant[rear.elbow], plant.torso) / scale;
  const onRear = distance(now.centerHip, now[rear.foot]) <= distance(now.centerHip, now[lead.foot]) * 1.05;
  const hipTowardLead = (distance(plant.centerHip, plant[lead.foot]) - distance(now.centerHip, now[lead.foot])) / scale;
  const sep = axisAngleDifference(
    lineAngleDegrees(now.leftShoulder, now.rightShoulder),
    lineAngleDegrees(now.leftHipJoint, now.rightHipJoint),
  );
  const plenty = rearArm >= Math.max(plantArm, 0.28) && (onRear || sep > 8);

  const space = plenty
    ? cue(
        "backspace",
        "Backspace",
        "Plenty",
        90,
        true,
        "After the front foot lands, you still have space on the rear arm and rear leg before the barrel gets to the ball. That is the 'back space' idea: most of the swing is this coil, not the contact pose.",
      )
    : cue(
        "backspace",
        "Backspace",
        "Tight / early",
        52,
        false,
        "The rear side is already emptying. Backspace is the room on the rear arm and rear leg after execution starts and before contact. Keep the rear elbow and rear hip back a beat longer so the barrel can be delivered from behind the ball.",
      );

  const backAxis = onRear && hipTowardLead < 0.12;
  const delivery = backAxis
    ? cue(
        "deliveryStyle",
        "How energy is delivered",
        "Back-leg axis",
        88,
        true,
        "The pelvis is still over the rear foot while the upper body twists. That is rotating on the back-leg axis (Harper, Judge, Ohtani, Soto holding the rear leg). Power stays on that rear hip instead of leaking into a lunge.",
      )
    : cue(
        "deliveryStyle",
        "How energy is delivered",
        "Forward transfer",
        hipTowardLead > 0.18 ? 70 : 76,
        hipTowardLead <= 0.22,
        hipTowardLead > 0.22
          ? "The center of mass is racing onto the front foot. Some hitters (Alvarez-style) do use an active forward transfer, but if you dump the rear leg you lose the coil. Stay on the rear hip a moment longer, then rotate."
          : "Weight is moving toward the front side while you turn. That can be a controlled forward transfer. Check that the rear heel is not peeling off before the torso has turned.",
      );

  return [space, delivery];
}

const CONTACT_OK: [number, number] = [-0.14, 0.14];

export function impactMetrics(
  frame: PoseFrame,
  handedness: Handedness,
  ballDetected: boolean,
): MetricResult[] {
  if (!ballDetected || !frame.ball) {
    return [
      cue(
        "ballContact",
        "Ball / bat contact",
        "Not found",
        0,
        false,
        "Ball not detected - no impact can be found. Phone fps, blur, or a white cage wall can hide a baseball. Record 60 fps in brighter light, keep the ball in frame, and we will mark contact when the ball meets the hands.",
      ),
    ];
  }

  const lead = leadJoints(handedness);
  const rear = rearJoints(handedness);
  const foot = frame.landmarks[lead.foot];
  const ball = frame.ball;
  const stride = {
    x: foot.x - frame.landmarks[rear.foot].x,
    y: foot.y - frame.landmarks[rear.foot].y,
  };
  const strideLen = Math.max(Math.hypot(stride.x, stride.y), 1e-4);
  const offset = ((ball.x - foot.x) * stride.x + (ball.y - foot.y) * stride.y) / strideLen;
  const onPlane = offset >= CONTACT_OK[0] && offset <= CONTACT_OK[1];
  const frontDump = distance(frame.landmarks.centerHip, frame.landmarks[lead.foot]) < distance(frame.landmarks.centerHip, frame.landmarks[rear.foot]) * 0.72;

  let where = "near the front-foot plane";
  let improve =
    "Keep one contact window: a vertical line up from the front foot. Change barrel direction for in/middle/away. Do not invent three different depths.";
  if (offset > CONTACT_OK[1]) {
    where = "out in front of the front foot";
    improve =
      "Contact is too far out front. Reaching for the ball turns the barrel early (hook/foul) and makes you cheat for the inside fastball. Land, then meet the ball at the front-foot plane — one window, three barrel directions (inside to the pull gap, middle up the middle, away to the opposite gap).";
  } else if (offset < CONTACT_OK[0]) {
    where = "too deep (behind the front-foot plane)";
    improve =
      "Contact is too deep. At high-school or college velo, waiting until the ball is almost past you means a swing-and-miss, a ball straight back, or weak opposite-field contact. Let the ball travel to the front-foot plane, not to the catcher.";
  }

  const plane = cue(
    "contactPlane",
    "Contact vs front foot",
    onPlane ? "On the plane" : offset > 0 ? "Too far out front" : "Too deep",
    onPlane ? 90 : 46,
    onPlane,
    onPlane
      ? `The ball is ${where}. That is the contact area: a line up from the front foot. It does not mean dump all your weight onto that foot. Stay balanced and adjustable, then drive through the window.`
      : `The ball is ${where}. ${improve}${frontDump ? " You also look stacked over the front leg. A good contact point is the ball’s location, not falling over the front side." : ""}`,
    offset,
  );
  plane.unit = "torso";
  plane.reference = CONTACT_OK;
  plane.display = undefined;

  return [
    cue(
      "ballContact",
      "Ball / bat contact",
      "Detected",
      92,
      true,
      "A baseball candidate meets the hands on this still. Treat it as contact only if you can see the ball on the frame. This is on-device vision, not TrackNet.",
    ),
    plane,
  ];
}

export function pickBackspaceIndex(frames: PoseFrame[], executionIndex: number, impactIndex: number, handedness: Handedness): number {
  const rear = rearJoints(handedness);
  const start = Math.min(executionIndex + 1, impactIndex);
  const end = Math.max(start, impactIndex - 1);
  let best = start;
  let bestScore = -Infinity;
  for (let index = start; index <= end; index += 1) {
    const now = frames[index].landmarks;
    const scale = torsoScale(now);
    const arm = distance(now[rear.elbow], now.torso) / scale;
    const sep = axisAngleDifference(
      lineAngleDegrees(now.leftShoulder, now.rightShoulder),
      lineAngleDegrees(now.leftHipJoint, now.rightHipJoint),
    );
    const score = arm * 40 + sep;
    if (score > bestScore) {
      bestScore = score;
      best = index;
    }
  }
  return best;
}
