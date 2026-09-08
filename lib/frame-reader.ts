import { ALL_FORMATS, BlobSource, CanvasSink, Input } from "mediabunny";

/** Demuxed presentation timestamps, independent of monitor refresh rate. */
export async function openFrameReader(file: Blob, longEdge: number) {
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track || !(await track.canDecode())) throw new Error("Frame-accurate decoding is unavailable for this codec.");
    const width = await track.getDisplayWidth(), height = await track.getDisplayHeight();
    const scale = Math.min(1, longEdge / Math.max(width, height));
    const stats = await track.computePacketStats(120);
    const sink = new CanvasSink(track, {
      width: Math.max(2, Math.floor(width * scale / 2) * 2),
      height: Math.max(2, Math.floor(height * scale / 2) * 2), poolSize: 3,
    });
    return { sink, fps: stats.averagePacketRate, dispose: () => input.dispose() };
  } catch (error) {
    input.dispose();
    throw error;
  }
}
