import type { ObjectKind } from "./object-tracking";

export type SportId = "baseball" | "softball" | "tennis" | "basketball" | "soccer"
  | "volleyball" | "golf" | "cricket" | "badminton" | "table-tennis"
  | "running" | "strength" | "cycling" | "swimming" | "martial-arts" | "other";
export type CameraView = "side" | "front" | "oblique";
export type PracticeGoal = "consistency" | "timing" | "control";
export type SportProfile = {
  id: SportId;
  name: string;
  action: string;
  focus: string;
  capture: string;
  equipment: string;
  objects: ObjectKind[];
  review: [string, string, string];
  limitation: string;
};

/** Product review prompts, not validated biomechanical reference ranges. */
export const SPORTS: SportProfile[] = [
  { id: "baseball", name: "Baseball", action: "Hitting / swing", focus: "Sequence and repeatability",
    capture: "Record one hitter from a fixed side view. Keep the whole body and bat path visible.",
    equipment: "Bat + sports-ball candidates", objects: ["bat", "ball"],
    review: ["Compare the setup across repetitions.", "Inspect the order of visible lower-body and hand movement.", "Compare the finish from the same camera angle."],
    limitation: "Bat boxes are not barrel tips. Ball sightings do not prove contact." },
  { id: "softball", name: "Softball", action: "Swing / throw", focus: "Preparation and follow-through",
    capture: "Record one player, including the full throw or swing path, from a fixed side view.",
    equipment: "Bat + sports-ball candidates", objects: ["bat", "ball"],
    review: ["Compare preparation in two repetitions.", "Inspect the transition into the throw or swing.", "Compare the finish and reset."],
    limitation: "No softball-specific detector or pitch classification is available." },
  { id: "tennis", name: "Tennis", action: "Serve / groundstroke", focus: "Preparation, strike window and recovery",
    capture: "Keep feet, racket and toss in view. Film one player from a fixed side or rear-oblique angle.",
    equipment: "Sports-ball candidates · racket unsupported", objects: ["ball"],
    review: ["Compare ready positions before the stroke.", "Inspect the visible racket preparation and hand path.", "Review recovery into the next ready position."],
    limitation: "Racket boxes do not locate the string bed; contact and spin are not measured." },
  { id: "basketball", name: "Basketball", action: "Shot / pass / dribble", focus: "Setup, release sequence and reset",
    capture: "Record one player from the side with the ball, hands and feet visible.",
    equipment: "Sports-ball candidates", objects: ["ball"],
    review: ["Compare the starting stance between attempts.", "Inspect the hand path around the release window.", "Review the landing or reset frame."],
    limitation: "No automatic make/miss, release instant, ball identity or shot-quality score." },
  { id: "soccer", name: "Soccer", action: "Pass / shot / touch", focus: "Approach, support step and follow-through",
    capture: "Film one player and the ball on open ground; include the approach and finish.",
    equipment: "Sports-ball candidates", objects: ["ball"],
    review: ["Compare approaches from the same angle.", "Inspect the support-foot and kicking-leg sequence.", "Compare the follow-through and recovery."],
    limitation: "No team/player re-identification, ball speed, spin or confirmed contact." },
  { id: "volleyball", name: "Volleyball", action: "Serve / spike / pass", focus: "Preparation and recovery",
    capture: "Keep the full reach, ball and landing visible. Use one player and a fixed camera.",
    equipment: "Sports-ball candidates", objects: ["ball"],
    review: ["Compare the starting position.", "Inspect the hand path during the action window.", "Review the landing or recovery."],
    limitation: "No jump height, impact force, contact timing or injury assessment." },
  { id: "golf", name: "Golf", action: "Swing / putt", focus: "Setup, transition and finish",
    capture: "Use the same face-on or down-the-line angle for both attempts. Keep the entire club path visible.",
    equipment: "Body only · club unsupported", objects: [],
    review: ["Compare address positions.", "Inspect the transition using visible body landmarks.", "Compare the finish without changing the camera angle."],
    limitation: "Golf clubs and tiny golf balls are not supported by the bundled detector." },
  { id: "cricket", name: "Cricket", action: "Batting / bowling", focus: "Preparation, delivery and finish",
    capture: "Film one player from the side, keeping the run-up or swing and finish in frame.",
    equipment: "Sports-ball candidates · cricket bat unsupported", objects: ["ball"],
    review: ["Compare the preparation.", "Review the delivery or stroke frame by frame.", "Compare the finish and reset."],
    limitation: "A cricket bat is not a baseball bat. Bowling legality and contact are not assessed." },
  { id: "badminton", name: "Badminton", action: "Serve / overhead / footwork", focus: "Preparation and recovery",
    capture: "Include the full overhead reach and feet. Use one athlete and bright lighting.",
    equipment: "Body only · shuttle/racket unsupported", objects: [],
    review: ["Compare the ready position.", "Inspect visible arm preparation.", "Review the return to the next ready position."],
    limitation: "Shuttlecock and badminton-racket detection are unavailable; no contact inference." },
  { id: "table-tennis", name: "Table tennis", action: "Serve / stroke", focus: "Ready position and repeatability",
    capture: "Film a single player with the table edge, hands and feet visible.",
    equipment: "Body only · paddle/tiny ball unsupported", objects: [],
    review: ["Compare ready positions.", "Inspect the visible hand path.", "Compare the recovery before the next stroke."],
    limitation: "No paddle localization, ball spin, tiny-ball tracking or contact timing." },
  { id: "running", name: "Running", action: "Stride / start", focus: "Visible stride sequence",
    capture: "Use a fixed side camera and a short pass through the frame; keep both feet visible.",
    equipment: "Body only", objects: [],
    review: ["Compare similar moments in two strides.", "Inspect visible arm and leg sequencing.", "Review whether the camera captured the whole stride."],
    limitation: "No validated gait diagnosis, ground-contact timing, force or running-economy score." },
  { id: "strength", name: "Strength & fitness", action: "Squat / lunge / exercise", focus: "Repeatability and visible range",
    capture: "Record one person from the same side or front angle, with the full range in frame.",
    equipment: "Body only · weights unsupported", objects: [],
    review: ["Compare the start positions.", "Review the visible range at comparable moments.", "Compare the controlled return to the start."],
    limitation: "No safe-load prescription, form certification or injury-risk prediction." },
  { id: "cycling", name: "Cycling", action: "Pedal cycle", focus: "Repeatability across pedal cycles",
    capture: "Use a stationary trainer and fixed side camera; keep the whole rider visible.",
    equipment: "Body only · bicycle not tracked", objects: [],
    review: ["Choose comparable points in two pedal cycles.", "Compare visible knee and elbow positions.", "Check whether the camera stayed fixed."],
    limitation: "No bike-fit prescription, power estimate or validated joint-loading assessment." },
  { id: "swimming", name: "Swimming", action: "Dry-land stroke review", focus: "Visible arm sequence",
    capture: "Prefer dry-land practice. Above-water video often hides joints; underwater tracking is unsupported.",
    equipment: "Body only · experimental visibility", objects: [],
    review: ["Compare a clearly visible start position.", "Inspect the visible arm sequence.", "Use another view if water hides body landmarks."],
    limitation: "Water occlusion can invalidate pose estimates. No hydrodynamic or in-water technique score." },
  { id: "martial-arts", name: "Martial arts", action: "Solo technique / footwork", focus: "Preparation, action and reset",
    capture: "Record a solo, non-contact repetition with the full limb paths visible.",
    equipment: "Body only", objects: [],
    review: ["Compare solo ready positions.", "Inspect visible limb sequencing.", "Compare the return to the ready position."],
    limitation: "No impact power, opponent tracking, combat advice or injury assessment." },
  { id: "other", name: "Other sport", action: "Custom movement", focus: "General movement review",
    capture: "Record one athlete, one short action, bright light and a fixed camera. Keep the full body visible.",
    equipment: "Body only · general review", objects: [],
    review: ["Choose your starting checkpoint.", "Inspect a key moment in your action.", "Compare the finish with another repetition."],
    limitation: "This is general 2D review, not a validated technique model for the named sport." },
];

export function getSport(id: string): SportProfile {
  return SPORTS.find((sport) => sport.id === id) ?? SPORTS[SPORTS.length - 1];
}

export function sportLabel(id: SportId, customName = "") {
  return id === "other" ? customName.trim().slice(0, 60) || "Other sport" : getSport(id).name;
}
