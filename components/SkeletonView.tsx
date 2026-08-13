"use client";

import { EMPHASIZED_POINTS, SKELETON_CONNECTIONS, SKELETON_POINTS } from "@/lib/skeleton";
import type { PoseFrame, PoseLandmark } from "@/lib/types";

export function SkeletonView({
  frame,
  label,
  showSkeleton = true,
  pathPoints,
}: {
  frame: PoseFrame;
  label: string;
  showSkeleton?: boolean;
  pathPoints?: PoseLandmark[];
}) {
  const landmarks = frame.landmarks;
  const path = pathPoints && pathPoints.length > 1 ? pathPoints.map((point) => `${point.x},${point.y}`).join(" ") : null;
  const pathEnd = path && pathPoints ? pathPoints[pathPoints.length - 1] : null;

  return (
    <figure className="skeleton-stage" aria-label={`${label} skeleton overlay`}>
      <svg viewBox="0 0 1 1" role="img">
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
          <image href={frame.previewDataUrl} width="1" height="1" preserveAspectRatio="xMidYMid meet" />
        ) : (
          <>
            <rect width="1" height="1" fill="url(#demo-bg)" />
            <ellipse cx=".5" cy=".9" rx=".46" ry=".16" fill="url(#field-glow)" />
            <path d="M0 .83H1M.5 .83V1" stroke="#8da197" strokeOpacity=".12" strokeWidth=".004" />
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
            {SKELETON_POINTS.map((joint) => (
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
