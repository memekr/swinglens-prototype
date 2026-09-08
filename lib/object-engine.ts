import type { ObjectDetector } from "@mediapipe/tasks-vision";
import { centerOfHeatmap, suppressDuplicates, type Box, type ObjectCandidate } from "./object-tracking";

/**
 * Neural semantic proposals first. Bright pixels alone NEVER create a detection.
 * This model exposes boxes, not learned heatmaps. The optional weighted center
 * below is a photometric refinement, not a TrackNet/CoH reproduction.
 */
export class ObjectEngine {
  private detector: ObjectDetector | null = null;
  async load() {
    const { FilesetResolver, ObjectDetector } = await import("@mediapipe/tasks-vision");
    const vision = await FilesetResolver.forVisionTasks("/wasm");
    this.detector = await ObjectDetector.createFromOptions(vision, {
      baseOptions: { modelAssetPath: "/models/efficientdet_lite0_v1.tflite", delegate: "CPU" },
      runningMode: "IMAGE", scoreThreshold: 0.2, maxResults: 30,
      categoryAllowlist: ["sports ball", "baseball bat"],
    });
  }
  detect(source: HTMLCanvasElement, tiled: boolean): ObjectCandidate[] {
    if (!this.detector) throw new Error("Object model is not loaded.");
    const regions: Box[] = [{ x: 0, y: 0, width: 1, height: 1 }];
    // Oversampling spends 5 inferences rather than pretending rescaling adds detail.
    if (tiled) for (const y of [0, 0.4]) for (const x of [0, 0.4]) regions.push({ x, y, width: 0.6, height: 0.6 });
    const candidates: ObjectCandidate[] = [];
    for (const region of regions) {
      const crop = document.createElement("canvas");
      crop.width = Math.max(1, Math.round(source.width * region.width));
      crop.height = Math.max(1, Math.round(source.height * region.height));
      const ctx = crop.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Cannot prepare the object-detection canvas.");
      ctx.drawImage(source, source.width * region.x, source.height * region.y,
        source.width * region.width, source.height * region.height, 0, 0, crop.width, crop.height);
      for (const detection of this.detector.detect(crop).detections) {
        const category = detection.categories[0], box = detection.boundingBox;
        if (!category || !box) continue;
        const kind = category.categoryName === "sports ball" ? "ball"
          : category.categoryName === "baseball bat" ? "bat" : null;
        if (!kind) continue;
        const x = Math.max(0, Math.floor(box.originX)), y = Math.max(0, Math.floor(box.originY));
        const w = Math.min(crop.width - x, Math.ceil(box.width)), h = Math.min(crop.height - y, Math.ceil(box.height));
        if (w < 1 || h < 1) continue;
        const normalized: Box = { x: region.x + x / source.width, y: region.y + y / source.height,
          width: w / source.width, height: h / source.height };
        let cx = x + w / 2, cy = y + h / 2;
        let localization: ObjectCandidate["localization"] = "box-center";
        if (kind === "ball" && w * h <= 65536) {
          const pixels = ctx.getImageData(x, y, w, h).data;
          const heat = new Float32Array(w * h);
          for (let i = 0; i < heat.length; i++) {
            const r = pixels[i * 4], g = pixels[i * 4 + 1], b = pixels[i * 4 + 2];
            const brightness = Math.min(r, g, b);
            const dx = ((i % w) + 0.5 - w / 2) / (w / 2);
            const dy = (Math.floor(i / w) + 0.5 - h / 2) / (h / 2);
            heat[i] = Math.max(0, brightness - 140) * Math.exp(-2 * (dx * dx + dy * dy));
          }
          const center = centerOfHeatmap(heat, w, h);
          // Conservative trust region prevents highlights pulling the center to an edge.
          if (center && Math.hypot((center.x - w / 2) / w, (center.y - h / 2) / h) <= 0.25) {
            cx = x + center.x; cy = y + center.y; localization = "weighted-center";
          }
        }
        candidates.push({ kind, x: region.x + cx / source.width, y: region.y + cy / source.height,
          score: category.score, box: normalized, localization });
      }
    }
    return suppressDuplicates(candidates);
  }
  close() { this.detector?.close(); this.detector = null; }
}
