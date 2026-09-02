import { describe, expect, it } from "vitest";
import { analyzePoseSequence } from "@/lib/analysis";
import { createDemoFrames } from "@/lib/demo";
import { FRAME_FILL_MAX, FRAME_FILL_MIN, framingCheck, poseFillRatio } from "@/lib/framing";
import { CORE_JOINTS } from "@/lib/skeleton";
import type { PoseLandmark, Skeleton } from "@/lib/types";

function scaleFill(landmarks: Skeleton, targetFill: number): Skeleton {
  const ys = CORE_JOINTS.map((joint) => landmarks[joint].y);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const span = Math.max(max - min, 1e-6);
  const center = (min + max) / 2;
  const scale = targetFill / span;
  const map = (point: PoseLandmark): PoseLandmark => ({
    ...point,
    y: center + (point.y - center) * scale,
  });
  return Object.fromEntries(
    Object.entries(landmarks).map(([joint, point]) => [joint, map(point)]),
  ) as Skeleton;
}

describe("framing quality", () => {
  it("passes inside the 65–85% capture range", () => {
    const fill = poseFillRatio(createDemoFrames()[8].landmarks);
    expect(fill).toBeGreaterThanOrEqual(FRAME_FILL_MIN);
    expect(fill).toBeLessThanOrEqual(FRAME_FILL_MAX);
    expect(framingCheck(fill).status).toBe("pass");
  });

  it("warns when the hitter is too small and does not fail", () => {
    const check = framingCheck(0.32);
    expect(check.status).toBe("warn");
    expect(check.detail).toMatch(/Move the camera closer|re-record/i);
  });

  it("warns when the hitter is too large without failing", () => {
    expect(framingCheck(0.93).status).toBe("warn");
  });

  it("does not withhold coaching solely because the player is small in frame", () => {
    const frames = createDemoFrames().map((frame) => ({
      ...frame,
      landmarks: scaleFill(frame.landmarks, 0.4),
    }));
    const result = analyzePoseSequence(frames, "right", frames.length);
    expect(result.quality.find((check) => check.key === "framing")?.status).toBe("warn");
    expect(result.quality.some((check) => check.status === "fail")).toBe(false);
    expect(result.canCoach).toBe(true);
  });
});
