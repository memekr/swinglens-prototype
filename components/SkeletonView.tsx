"use client";

import { POSE, SKELETON_CONNECTIONS, midpoint } from "@/lib/geometry";
import type { PoseFrame } from "@/lib/types";

export function SkeletonView({ frame, label }: { frame: PoseFrame; label: string }) {
  const landmarks = frame.landmarks;
  const wrists = midpoint(landmarks[POSE.leftWrist], landmarks[POSE.rightWrist]);
  const batEnd = {
    x: Math.min(1.08, wrists.x + (landmarks[POSE.rightWrist].x - landmarks[POSE.leftWrist].x) * 3.6),
    y: Math.max(-0.08, wrists.y + (landmarks[POSE.rightWrist].y - landmarks[POSE.leftWrist].y) * 3.6),
  };

  return (
    <figure className="skeleton-stage" aria-label={`${label} 스켈레톤 오버레이`}>
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
        <g className="skeleton-shadow" opacity=".45" transform="translate(.006 .008)">
          {SKELETON_CONNECTIONS.map(([from, to]) => (
            <line key={`${from}-${to}`} x1={landmarks[from].x} y1={landmarks[from].y} x2={landmarks[to].x} y2={landmarks[to].y} />
          ))}
        </g>
        <g className="skeleton-lines">
          {SKELETON_CONNECTIONS.map(([from, to]) => (
            <line key={`${from}-${to}`} x1={landmarks[from].x} y1={landmarks[from].y} x2={landmarks[to].x} y2={landmarks[to].y} />
          ))}
          <line className="bat-line" x1={wrists.x} y1={wrists.y} x2={batEnd.x} y2={batEnd.y} />
        </g>
        <g className="skeleton-points">
          {[0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].map((index) => (
            <circle key={index} cx={landmarks[index].x} cy={landmarks[index].y} r={index === 15 || index === 16 ? 0.013 : 0.01} />
          ))}
        </g>
      </svg>
      <figcaption>
        <span>{label}</span>
        <time>{(frame.timestampMs / 1000).toFixed(2)}초</time>
      </figcaption>
    </figure>
  );
}
