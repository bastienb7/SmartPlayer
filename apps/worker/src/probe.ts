import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { config } from "./config";

const execFileAsync = promisify(execFile);

export interface ProbeResult {
  duration: number;
  width: number;
  height: number;
  codec: string;
  fps: number;
  bitrate: number;
  audioCodec: string;
  audioSampleRate: number;
}

export async function probeVideo(inputPath: string): Promise<ProbeResult> {
  const { stdout } = await execFileAsync(config.FFPROBE_PATH, [
    "-v", "quiet",
    "-print_format", "json",
    "-show_format",
    "-show_streams",
    inputPath,
  ]);

  const data = JSON.parse(stdout);
  const videoStream = data.streams?.find((s: any) => s.codec_type === "video");
  const audioStream = data.streams?.find((s: any) => s.codec_type === "audio");
  const format = data.format || {};

  if (!videoStream) {
    throw new Error("No video stream found in file");
  }

  // Parse FPS from r_frame_rate (e.g., "30/1" or "30000/1001")
  let fps = 30;
  if (videoStream.r_frame_rate) {
    const [num, den] = videoStream.r_frame_rate.split("/").map(Number);
    if (den > 0) fps = Math.round(num / den);
  }

  return {
    duration: parseFloat(format.duration || videoStream.duration || "0"),
    width: videoStream.width || 0,
    height: videoStream.height || 0,
    codec: videoStream.codec_name || "unknown",
    fps,
    bitrate: parseInt(format.bit_rate || "0"),
    audioCodec: audioStream?.codec_name || "none",
    audioSampleRate: parseInt(audioStream?.sample_rate || "0"),
  };
}

/**
 * Filter renditions to only include those <= source resolution
 */
export function filterRenditions(sourceHeight: number) {
  return config.RENDITIONS.filter((r) => r.height <= sourceHeight);
}
