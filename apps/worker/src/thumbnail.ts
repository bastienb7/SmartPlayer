import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { config } from "./config";

const execFileAsync = promisify(execFile);

/**
 * Generate a poster thumbnail at a specific timestamp.
 * Defaults to 10% into the video.
 */
export async function generateThumbnail(
  inputPath: string,
  outputDir: string,
  duration: number,
  timestamp?: number
): Promise<string> {
  const time = timestamp ?? Math.min(duration * 0.1, 10);
  const outputPath = path.join(outputDir, "poster.jpg");

  await execFileAsync(config.FFMPEG_PATH, [
    "-y",
    "-ss", time.toString(),
    "-i", inputPath,
    "-vframes", "1",
    "-q:v", "2",
    "-vf", "scale=1280:-2",
    outputPath,
  ]);

  return outputPath;
}

/**
 * Generate a thumbnail strip for preview scrubbing.
 * Creates a grid of thumbnails at regular intervals.
 */
export async function generateThumbnailStrip(
  inputPath: string,
  outputDir: string,
  duration: number,
  count: number = 20
): Promise<string> {
  const interval = Math.max(1, Math.floor(duration / count));
  const outputPath = path.join(outputDir, "strip.jpg");

  await execFileAsync(config.FFMPEG_PATH, [
    "-y",
    "-i", inputPath,
    "-vf", `fps=1/${interval},scale=160:-2,tile=${count}x1`,
    "-frames:v", "1",
    "-q:v", "3",
    outputPath,
  ]);

  return outputPath;
}
