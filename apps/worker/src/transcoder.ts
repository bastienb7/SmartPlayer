import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import { config, type Rendition } from "./config";

const execFileAsync = promisify(execFile);

export interface TranscodeResult {
  rendition: Rendition;
  playlistPath: string;
  segmentDir: string;
}

/**
 * Transcode a video to a single HLS rendition.
 */
export async function transcodeRendition(
  inputPath: string,
  outputDir: string,
  rendition: Rendition
): Promise<TranscodeResult> {
  const renditionDir = path.join(outputDir, rendition.name);
  await fs.mkdir(renditionDir, { recursive: true });

  const playlistPath = path.join(renditionDir, "playlist.m3u8");

  await execFileAsync(config.FFMPEG_PATH, [
    "-y",
    "-i", inputPath,
    // Video
    "-c:v", "libx264",
    "-preset", "medium",
    "-profile:v", "main",
    "-level", "4.0",
    "-b:v", rendition.bitrate,
    "-maxrate", rendition.maxrate,
    "-bufsize", rendition.bufsize,
    "-vf", `scale=w=${rendition.width}:h=${rendition.height}:force_original_aspect_ratio=decrease,pad=${rendition.width}:${rendition.height}:(ow-iw)/2:(oh-ih)/2`,
    "-g", "48",        // Keyframe interval (2s at 24fps)
    "-keyint_min", "48",
    "-sc_threshold", "0",
    // Audio
    "-c:a", "aac",
    "-b:a", rendition.audioBitrate,
    "-ar", "48000",
    "-ac", "2",
    // HLS
    "-f", "hls",
    "-hls_time", "6",
    "-hls_list_size", "0",
    "-hls_segment_filename", path.join(renditionDir, "seg_%03d.ts"),
    "-hls_playlist_type", "vod",
    playlistPath,
  ], {
    timeout: 600_000, // 10 min max per rendition
  });

  return {
    rendition,
    playlistPath,
    segmentDir: renditionDir,
  };
}

/**
 * Generate a master HLS playlist that references all renditions.
 */
export async function generateMasterPlaylist(
  outputDir: string,
  results: TranscodeResult[]
): Promise<string> {
  const masterPath = path.join(outputDir, "master.m3u8");

  let content = "#EXTM3U\n#EXT-X-VERSION:3\n\n";

  for (const result of results) {
    const { rendition } = result;
    const bandwidth = parseInt(rendition.bitrate) * 1000;
    const audioBandwidth = parseInt(rendition.audioBitrate) * 1000;

    content += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth + audioBandwidth},RESOLUTION=${rendition.width}x${rendition.height},NAME="${rendition.name}"\n`;
    content += `${rendition.name}/playlist.m3u8\n\n`;
  }

  await fs.writeFile(masterPath, content, "utf-8");
  return masterPath;
}

/**
 * Full transcode pipeline: probe → filter renditions → transcode all → master playlist
 */
export async function transcodeToHLS(
  inputPath: string,
  outputDir: string,
  sourceHeight: number
): Promise<{ masterPath: string; results: TranscodeResult[] }> {
  await fs.mkdir(outputDir, { recursive: true });

  // Filter renditions based on source resolution
  const renditions = config.RENDITIONS.filter((r) => r.height <= sourceHeight);

  // Always include at least 360p
  if (renditions.length === 0) {
    renditions.push(config.RENDITIONS[0]);
  }

  console.log(`[Transcoder] Transcoding ${renditions.length} renditions: ${renditions.map((r) => r.name).join(", ")}`);

  // Transcode sequentially (parallel would compete for CPU)
  const results: TranscodeResult[] = [];
  for (const rendition of renditions) {
    console.log(`[Transcoder] Starting ${rendition.name}...`);
    const result = await transcodeRendition(inputPath, outputDir, rendition);
    results.push(result);
    console.log(`[Transcoder] ✅ ${rendition.name} complete`);
  }

  // Generate master playlist
  const masterPath = await generateMasterPlaylist(outputDir, results);
  console.log(`[Transcoder] ✅ Master playlist generated`);

  return { masterPath, results };
}
