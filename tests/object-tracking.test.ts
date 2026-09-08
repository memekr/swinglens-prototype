import { describe, expect, it } from "vitest";
import { boxIou, centerOfHeatmap, OnlineObjectTracker, reviewAt } from "@/lib/object-tracking";

describe("object evidence tracking", () => {
  it("uses center of heatmap mass", () => {
    const center = centerOfHeatmap([0, 1, 1, 0, 0, 3, 3, 0, 0], 3, 3);
    expect(center?.x).toBeCloseTo(1.625);
    expect(center?.y).toBeCloseTo(1.625);
  });
  it("confirms moving candidates only after repeated observations", () => {
    const tracker = new OnlineObjectTracker(16 / 9);
    const candidate = (x: number) => ({ kind: "ball" as const, x, y: .4, score: .9, box: { x: x - .01, y: .39, width: .02, height: .02 }, localization: "weighted-center" as const });
    expect(tracker.update([candidate(.2)], 0)[0].confirmed).toBe(false);
    expect(tracker.update([candidate(.21)], 40)[0].trackId).toBe(1);
    expect(tracker.update([candidate(.22)], 80)[0].confirmed).toBe(true);
  });
  it("does not bridge a missing interval", () => {
    const a = [{ timestampMs: 0, objects: [] }, { timestampMs: 200, objects: [] }];
    expect(reviewAt(a, 100).objects).toHaveLength(0);
    expect(boxIou({ x: 0, y: 0, width: 1, height: 1 }, { x: .5, y: .5, width: 1, height: 1 })).toBeCloseTo(1 / 7);
  });
});
