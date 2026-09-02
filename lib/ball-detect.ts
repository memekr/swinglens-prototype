import { midpoint, torsoScale } from "./geometry";
import type { BallSpot, PoseFrame, Skeleton } from "./types";

function xyDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

const WORK_WIDTH = 320;
const MIN_HITS = 2;
const APPROACH_TORSO = 0.38;

function isBallish(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  if (max > 188 && saturation < 0.38) return true;
  if (r > 175 && g > 135 && b < 125 && max > 155) return true;
  return false;
}

function bodyExclusion(skeleton: Skeleton, x: number, y: number): boolean {
  const core: Array<{ x: number; y: number; r: number }> = [
    { ...skeleton.head, r: 0.07 },
    { ...skeleton.torso, r: 0.09 },
    { ...skeleton.centerHip, r: 0.08 },
    { ...skeleton.leftHipJoint, r: 0.055 },
    { ...skeleton.rightHipJoint, r: 0.055 },
    { ...skeleton.leftKnee, r: 0.05 },
    { ...skeleton.rightKnee, r: 0.05 },
    { ...skeleton.leftFoot, r: 0.045 },
    { ...skeleton.rightFoot, r: 0.045 },
    { ...skeleton.leftShoulder, r: 0.05 },
    { ...skeleton.rightShoulder, r: 0.05 },
  ];
  return core.some((joint) => Math.hypot(x - joint.x, y - joint.y) < joint.r);
}

type Blob = { x: number; y: number; count: number; score: number };

/**
 * Find a small bright baseball candidate. Coordinates are 0–1 on the source frame.
 * Hands are not masked: at contact the ball sits next to the wrists.
 */
export function detectBall(source: HTMLCanvasElement, skeleton: Skeleton): BallSpot | null {
  const scale = WORK_WIDTH / source.width;
  const width = WORK_WIDTH;
  const height = Math.max(1, Math.round(source.height * scale));
  const work = document.createElement("canvas");
  work.width = width;
  work.height = height;
  const context = work.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(source, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  const step = 2;
  const blobs: Blob[] = [];

  for (let y = 2; y < height - 2; y += step) {
    for (let x = 2; x < width - 2; x += step) {
      const i = (y * width + x) * 4;
      if (!isBallish(pixels[i], pixels[i + 1], pixels[i + 2])) continue;
      const nx = x / width;
      const ny = y / height;
      if (bodyExclusion(skeleton, nx, ny)) continue;
      let nearest = -1;
      let best = 0.018;
      for (let b = 0; b < blobs.length; b += 1) {
        const gap = Math.hypot(nx - blobs[b].x, ny - blobs[b].y);
        if (gap < best) {
          best = gap;
          nearest = b;
        }
      }
      const luminance = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      if (nearest >= 0) {
        const blob = blobs[nearest];
        blob.x = (blob.x * blob.count + nx) / (blob.count + 1);
        blob.y = (blob.y * blob.count + ny) / (blob.count + 1);
        blob.count += 1;
        blob.score += luminance;
      } else {
        blobs.push({ x: nx, y: ny, count: 1, score: luminance });
      }
    }
  }

  const plausible = blobs.filter((blob) => blob.count >= 3 && blob.count <= 90);
  if (!plausible.length) return null;
  plausible.sort((a, b) => b.score / b.count + b.count * 0.4 - (a.score / a.count + a.count * 0.4));
  const pick = plausible[0];
  return { x: pick.x, y: pick.y, score: pick.score / pick.count / 255 };
}

/** Drop isolated lamp hits. Keep a path that actually moves. */
export function stabilizeBallTrack(frames: PoseFrame[]): PoseFrame[] {
  const hits = frames
    .map((frame, index) => ({ index, ball: frame.ball }))
    .filter((item): item is { index: number; ball: BallSpot } => Boolean(item.ball));
  if (hits.length < MIN_HITS) {
    return frames.map((frame) => ({ ...frame, ball: null }));
  }

  const travel = Math.hypot(hits[hits.length - 1].ball.x - hits[0].ball.x, hits[hits.length - 1].ball.y - hits[0].ball.y);
  if (travel < 0.04) {
    return frames.map((frame) => ({ ...frame, ball: null }));
  }

  const kept = new Set<number>();
  let previous = hits[0];
  kept.add(previous.index);
  for (let index = 1; index < hits.length; index += 1) {
    const gap = Math.hypot(hits[index].ball.x - previous.ball.x, hits[index].ball.y - previous.ball.y);
    const dt = Math.max(1, hits[index].index - previous.index);
    if (gap / dt < 0.22) {
      kept.add(hits[index].index);
      previous = hits[index];
    }
  }
  if (kept.size < MIN_HITS) {
    return frames.map((frame) => ({ ...frame, ball: null }));
  }
  return frames.map((frame, index) => (kept.has(index) ? frame : { ...frame, ball: null }));
}

function hands(frame: PoseFrame) {
  return midpoint(frame.landmarks.leftHand, frame.landmarks.rightHand);
}

/**
 * Impact is the still where a tracked ball is closest to the hands after
 * the front foot plants, and the ball is still approaching.
 */
export function findBallImpactIndex(
  frames: PoseFrame[],
  searchStart: number,
  searchEnd: number,
): number | null {
  const start = Math.max(0, searchStart);
  const end = Math.min(frames.length - 1, Math.max(start + 1, searchEnd));
  let bestIndex = -1;
  let bestDistance = Infinity;
  for (let index = start; index <= end; index += 1) {
    const ball = frames[index].ball;
    if (!ball) continue;
    const gap = xyDistance(ball, hands(frames[index]));
    if (gap < bestDistance) {
      bestDistance = gap;
      bestIndex = index;
    }
  }
  if (bestIndex < 0) return null;
  const scale = torsoScale(frames[bestIndex].landmarks);
  if (bestDistance > APPROACH_TORSO * scale + 0.08) return null;

  const earlier = Math.max(start, bestIndex - 3);
  const earlierBall = frames.slice(earlier, bestIndex).map((frame) => frame.ball).find(Boolean);
  if (earlierBall) {
    const earlierGap = xyDistance(earlierBall, hands(frames[bestIndex]));
    if (earlierGap + 0.01 < bestDistance) return null;
  }
  return bestIndex;
}
