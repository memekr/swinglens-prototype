import { CORE_JOINTS } from "./skeleton";
import type { QualityCheck, Skeleton } from "./types";

/** Hitter height in the frame. Target about 65–85% with head, feet, hands, and bat path visible. */
export const FRAME_FILL_MIN = 0.65;
export const FRAME_FILL_MAX = 0.85;

export function poseFillRatio(skeleton: Skeleton): number {
  const ys = CORE_JOINTS.map((joint) => skeleton[joint]?.y).filter(Number.isFinite);
  if (ys.length < 2) return 0;
  return Math.max(...ys) - Math.min(...ys);
}

export function framingCheck(fill: number): QualityCheck {
  const percent = Math.round(fill * 100);
  if (fill >= FRAME_FILL_MIN && fill <= FRAME_FILL_MAX) {
    return {
      key: "framing",
      label: "Subject scale",
      status: "pass",
      detail: `The hitter fills about ${percent}% of the frame height (target 65–85%).`,
    };
  }
  if (fill < FRAME_FILL_MIN) {
    return {
      key: "framing",
      label: "Subject scale",
      status: "warn",
      detail: `The hitter is only ${percent}% of the frame height (target 65–85%). Move the camera closer or re-record. Upscaling this clip will not add pose detail.`,
    };
  }
  return {
    key: "framing",
    label: "Subject scale",
    status: "warn",
    detail: `The hitter fills about ${percent}% of the frame. Keep the head, both feet, both hands, and the full bat path in view.`,
  };
}
