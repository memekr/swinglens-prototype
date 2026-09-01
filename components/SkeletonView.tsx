"use client";

import { EMPHASIZED_POINTS, SKELETON_CONNECTIONS, SKELETON_POINTS } from "@/lib/skeleton";
import type { BodyJoint, PoseFrame, PoseLandmark, Skeleton } from "@/lib/types";

/**
 * MediaPipe normalizes x independently of y (x = pixel_x / width, y = pixel_y
 * / height), so both are already in [0, 1] on their own axis. The viewBox
 * width is `aspectRatio` (not 1), so any x that stays in [0, 1] renders
 * compressed into the left slice of the frame — this is the single
 * conversion every landmark must go through before it's drawn.
 */
function toDisplay(point: PoseLandmark, aspectRatio: number): PoseLandmark {
  return { ...point, x: point.x * aspectRatio };
}

export function SkeletonView({
  frame,
  label,
  showSkeleton = true,
  pathPoints,
  aspectRatio = 1,
}: {
  frame: PoseFrame;
  label: string;
  showSkeleton?: boolean;
  pathPoints?: PoseLandmark[];
  /** Analyzed-frame width / height. */
  aspectRatio?: number;
}) {
  const landmarks = Object.fromEntries(
    SKELETON_POINTS.map((joint) => [joint, toDisplay(frame.landmarks[joint], aspectRatio)]),
  ) as Skeleton;
  const displayPath = pathPoints?.map((point) => toDisplay(point, aspectRatio));
  const path = displayPath && displayPath.length > 1 ? displayPath.map((point) => `${point.x},${point.y}`).join(" ") : null;
  const pathEnd = path && displayPath ? displayPath[displayPath.length - 1] : null;

  return (
    <figure
      className="skeleton-stage"
      aria-label={`${label} skeleton overlay`}
      style={{ ["--frame-aspect" as string]: String(aspectRatio) }}
    >
      <svg viewBox={`0 0 ${aspectRatio} 1`} preserveAspectRatio="xMidYMid meet" role="img">
        <defs>
          <linearGradient id="demo-bg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#12251d" />
            <stop offset="1" stopColor="#07110d" />
          </linearGradient>
          <radialGradient id="field-glow">
            <stop offset="0" stopColor="#34523f" stopOpacity="0.7" />
            <stop offset="1" stopColor="#07110d" stopOpacity="0" />
          </radialGradient>
        </defs>
        {frame.previewDataUrl ? (
          <image href={frame.previewDataUrl} width={aspectRatio} height="1" preserveAspectRatio="none" />
        ) : (
          <>
            <rect width={aspectRatio} height="1" fill="url(#demo-bg)" />
            <ellipse cx={aspectRatio / 2} cy=".9" rx={aspectRatio * 0.46} ry=".16" fill="url(#field-glow)" />
            <path d={`M0 .83H${aspectRatio}M${aspectRatio / 2} .83V1`} stroke="#8da197" strokeOpacity=".12" strokeWidth=".004" />
          </>
        )}
        {showSkeleton && <>
          <g className="skeleton-shadow" opacity=".45" transform="translate(.006 .008)">
            {SKELETON_CONNECTIONS.map(([from, to]) => (
              <line key={`${from}-${to}`} x1={landmarks[from].x} y1={landmarks[from].y} x2={landmarks[to].x} y2={landmarks[to].y} />
            ))}
          </g>
          <g className="skeleton-lines">
            {SKELETON_CONNECTIONS.map(([from, to]) => (
              <line key={`${from}-${to}`} x1={landmarks[from].x} y1={landmarks[from].y} x2={landmarks[to].x} y2={landmarks[to].y} />
            ))}
          </g>
          <g className="skeleton-points">
            {SKELETON_POINTS.map((joint: BodyJoint) => (
              <circle key={joint} cx={landmarks[joint].x} cy={landmarks[joint].y} r={EMPHASIZED_POINTS.includes(joint) ? 0.013 : 0.01} />
            ))}
          </g>
        </>}
        {path && (
          <g className="skeleton-path" aria-label="Tracked hand path from impact through follow-through">
            <polyline points={path} />
            {pathEnd && <circle className="path-end" cx={pathEnd.x} cy={pathEnd.y} r="0.015" />}
          </g>
        )}
      </svg>
      <figcaption>
        <span>{label}</span>
        <time>{(frame.timestampMs / 1000).toFixed(2)}s</time>
      </figcaption>
    </figure>
  );
}
