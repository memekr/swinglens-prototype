/** Pure, timestamp-based tracking. Predictions associate detections; they never become observations. */
export type ObjectKind = "ball" | "bat" | "racket";
export type Box = { x: number; y: number; width: number; height: number };
export type ObjectCandidate = {
  kind: ObjectKind;
  x: number;
  y: number;
  score: number;
  box: Box;
  localization: "box-center" | "weighted-center";
};
export type ObjectObservation = ObjectCandidate & {
  trackId: number;
  confirmed: boolean;
  evidence: "observed";
};
export type ObjectTrackFrame = { timestampMs: number; objects: ObjectObservation[] };

/** Center of positive heatmap mass, not argmax. Reject empty/invalid maps. */
export function centerOfHeatmap(values: ArrayLike<number>, width: number, height: number) {
  if (width < 1 || height < 1 || values.length !== width * height) return null;
  let mass = 0, x = 0, y = 0;
  for (let i = 0; i < values.length; i++) {
    const weight = values[i];
    if (!Number.isFinite(weight) || weight <= 0) continue;
    mass += weight;
    x += (i % width + 0.5) * weight;
    y += (Math.floor(i / width) + 0.5) * weight;
  }
  return mass > 0 ? { x: x / mass, y: y / mass } : null;
}

export function boxIou(a: Box, b: Box) {
  const intersection = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
    * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return intersection / Math.max(1e-9, a.width * a.height + b.width * b.height - intersection);
}

export function suppressDuplicates(candidates: ObjectCandidate[]) {
  const kept: ObjectCandidate[] = [];
  for (const candidate of [...candidates].sort((a, b) => b.score - a.score)) {
    if (!kept.some((other) => other.kind === candidate.kind && boxIou(other.box, candidate.box) > 0.35)) {
      kept.push(candidate);
    }
  }
  return kept.slice(0, 24);
}

type Track = {
  id: number;
  last: ObjectCandidate;
  time: number;
  vx: number;
  vy: number;
  hits: number;
  first: { x: number; y: number };
  travel: number;
};

export class OnlineObjectTracker {
  private tracks: Track[] = [];
  private nextId = 1;
  private time = -Infinity;
  constructor(private readonly aspectRatio = 1) {}

  update(candidates: ObjectCandidate[], timestampMs: number): ObjectObservation[] {
    if (!Number.isFinite(timestampMs) || timestampMs <= this.time) return [];
    this.time = timestampMs;
    // Short memory: never attach a ball from a later pitch to the previous pitch.
    this.tracks = this.tracks.filter((track) => timestampMs - track.time <= 180);
    const valid = suppressDuplicates(candidates.filter((c) =>
      [c.x, c.y, c.score, c.box.x, c.box.y, c.box.width, c.box.height].every(Number.isFinite)
      && c.x >= 0 && c.x <= 1 && c.y >= 0 && c.y <= 1
      && c.box.width > 0 && c.box.height > 0 && c.score >= 0.2,
    ));
    // Global greedy one-to-one association avoids two objects consuming the same ID.
    const edges: { track: Track; index: number; cost: number }[] = [];
    for (const track of this.tracks) {
      const dt = (timestampMs - track.time) / 1000;
      const px = track.last.x + track.vx * dt, py = track.last.y + track.vy * dt;
      valid.forEach((candidate, index) => {
        if (candidate.kind !== track.last.kind) return;
        const gap = Math.hypot((candidate.x - px) * this.aspectRatio, candidate.y - py);
        const gate = (candidate.kind === "ball" ? 0.035 : 0.10) + dt * (track.hits < 2 ? 5 : 2);
        const sizeRatio = candidate.box.width * candidate.box.height
          / (track.last.box.width * track.last.box.height);
        if (gap > gate || sizeRatio > 5 || sizeRatio < 0.2) return;
        edges.push({ track, index, cost: gap / gate + Math.abs(Math.log(sizeRatio)) * 0.12 - candidate.score * 0.1 });
      });
    }
    edges.sort((a, b) => a.cost - b.cost);
    const assigned = new Map<number, Track>();
    const used = new Set<number>();
    for (const edge of edges) {
      if (assigned.has(edge.index) || used.has(edge.track.id)) continue;
      assigned.set(edge.index, edge.track);
      used.add(edge.track.id);
    }
    return valid.map((candidate, index) => {
      let track = assigned.get(index);
      if (!track) {
        track = { id: this.nextId++, last: candidate, time: timestampMs, vx: 0, vy: 0, hits: 1, first: candidate, travel: 0 };
        this.tracks.push(track);
      } else {
        const dt = (timestampMs - track.time) / 1000;
        const vx = (candidate.x - track.last.x) / dt, vy = (candidate.y - track.last.y) / dt;
        // Keep the measured coordinate; filter only the association velocity.
        track.vx = track.hits === 1 ? vx : 0.75 * vx + 0.25 * track.vx;
        track.vy = track.hits === 1 ? vy : 0.75 * vy + 0.25 * track.vy;
        track.travel = Math.max(track.travel, Math.hypot((candidate.x - track.first.x) * this.aspectRatio, candidate.y - track.first.y));
        track.hits++;
        track.time = timestampMs;
        track.last = candidate;
      }
      // Static bright spots and isolated semantic false positives stay tentative.
      const confirmed = track.hits >= 3 && (candidate.kind === "bat" || track.travel >= 0.012);
      return { ...candidate, trackId: track.id, confirmed, evidence: "observed" as const };
    });
  }
}

/** Display-only 120 Hz trajectory resampling. Never bridges loss or identity changes. */
export function reviewAt(frames: ObjectTrackFrame[], timestampMs: number) {
  const exact = frames.find((frame) => Math.abs(frame.timestampMs - timestampMs) < 0.5);
  if (exact) return { ...exact, interpolated: false };
  const index = frames.findIndex((frame) => frame.timestampMs > timestampMs);
  if (index <= 0) return { timestampMs, objects: [], interpolated: false };
  const a = frames[index - 1], b = frames[index];
  const gap = b.timestampMs - a.timestampMs;
  if (gap > 100) return { timestampMs, objects: [], interpolated: false };
  const alpha = (timestampMs - a.timestampMs) / gap;
  const lerp = (x: number, y: number) => x + (y - x) * alpha;
  const objects = a.objects.filter((o) => o.confirmed).flatMap((left) => {
    const right = b.objects.find((o) => o.trackId === left.trackId && o.confirmed);
    return right ? [{
      ...left, x: lerp(left.x, right.x), y: lerp(left.y, right.y),
      box: { x: lerp(left.box.x, right.box.x), y: lerp(left.box.y, right.box.y),
        width: lerp(left.box.width, right.box.width), height: lerp(left.box.height, right.box.height) },
      evidence: "interpolated" as const,
    }] : [];
  });
  return { timestampMs, objects, interpolated: true };
}
