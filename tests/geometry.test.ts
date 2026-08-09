import { describe, expect, it } from "vitest";
import { angleDegrees, axisAngleDifference, midpoint } from "@/lib/geometry";
import type { PoseLandmark } from "@/lib/types";

const point = (x: number, y: number): PoseLandmark => ({ x, y, z: 0, visibility: 1 });

describe("pose geometry", () => {
  it("calculates an interior joint angle", () => {
    expect(angleDegrees(point(1, 0), point(0, 0), point(0, 1))).toBeCloseTo(90);
    expect(angleDegrees(point(-1, 0), point(0, 0), point(1, 0))).toBeCloseTo(180);
  });

  it("treats undirected body axes as equivalent", () => {
    expect(axisAngleDifference(178, 2)).toBe(4);
    expect(axisAngleDifference(10, 30)).toBe(20);
  });

  it("keeps the lower landmark visibility at a midpoint", () => {
    const middle = midpoint({ ...point(0, 0), visibility: 0.6 }, { ...point(1, 1), visibility: 0.9 });
    expect(middle).toMatchObject({ x: 0.5, y: 0.5, visibility: 0.6 });
  });
});
