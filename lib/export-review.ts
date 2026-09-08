import { BufferTarget, CanvasSource, Mp4OutputFormat, Output, canEncodeVideo } from "mediabunny";
import { openFrameReader } from "./frame-reader";

/**
 * Local, bounded 120 fps MP4 export. Cross-dissolve interpolation is explicitly
 * watermarked; this is neither neural super-resolution nor optical-flow recovery.
 */
export async function export120Review(
  file: Blob, startSeconds: number, durationSeconds: number,
  signal: AbortSignal, progress: (percent: number) => void,
): Promise<Blob> {
  if (!Number.isFinite(startSeconds) || startSeconds < 0 || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error("Choose a valid review interval.");
  }
  const duration = Math.min(4, durationSeconds);
  const reader = await openFrameReader(file, 720);
  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat(), target });
  let finalized = false;
  const iterator = reader.sink.canvases(startSeconds, startSeconds + duration + 0.3);
  try {
    signal.throwIfAborted();
    let left = (await iterator.next()).value;
    let right = (await iterator.next()).value;
    if (!left) throw new Error("No video frames at this review time.");
    const canvas = document.createElement("canvas");
    canvas.width = left.canvas.width;
    canvas.height = left.canvas.height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas export is unavailable.");
    if (!await canEncodeVideo("avc", { width: canvas.width, height: canvas.height, bitrate: 3_000_000 })) {
      throw new Error("This browser cannot encode H.264. Try Chrome or Safari with WebCodecs support.");
    }
    const source = new CanvasSource(canvas, { codec: "avc", bitrate: 3_000_000 });
    output.addVideoTrack(source, { frameRate: 120 });
    await output.start();
    const origin = Math.max(startSeconds, left.timestamp);
    const count = Math.max(1, Math.floor(duration * 120));
    for (let i = 0; i < count; i++) {
      signal.throwIfAborted();
      const time = origin + i / 120;
      while (right && right.timestamp <= time) {
        left = right;
        right = (await iterator.next()).value;
      }
      // Do not turn a truncated clip into a frozen four-second export.
      if (!right && time >= left.timestamp + left.duration) break;
      const alpha = right ? Math.max(0, Math.min(1, (time - left.timestamp) / (right.timestamp - left.timestamp))) : 0;
      context.globalAlpha = 1;
      context.drawImage(left.canvas, 0, 0);
      if (right && alpha > 0) {
        context.globalAlpha = alpha;
        context.drawImage(right.canvas, 0, 0);
        context.globalAlpha = 1;
      }
      context.fillStyle = "rgba(0,0,0,.75)";
      context.fillRect(0, canvas.height - 30, canvas.width, 30);
      context.fillStyle = "#e7ff86";
      context.font = `${Math.max(9, Math.min(12, canvas.width / 45))}px monospace`;
      context.fillText("120 FPS BLENDED REVIEW · NOT MEASUREMENT · NO AUDIO", 8, canvas.height - 11);
      await source.add(i / 120, 1 / 120);
      if (i % 12 === 0) {
        progress(Math.round(i / count * 100));
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    }
    await output.finalize();
    finalized = true;
    progress(100);
    if (!target.buffer) throw new Error("The encoder returned no video.");
    return new Blob([target.buffer], { type: "video/mp4" });
  } finally {
    await iterator.return();
    if (!finalized) await output.cancel().catch(() => undefined);
    reader.dispose();
  }
}
