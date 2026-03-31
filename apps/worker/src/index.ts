import { Worker } from "bullmq";
import Redis from "ioredis";
import os from "node:os";
import fs from "node:fs/promises";
import path from "node:path";
import { db, videos } from "@smartplayer/db";
import { eq } from "drizzle-orm";
import { config } from "./config";
import { probeVideo, filterRenditions } from "./probe";
import { transcodeToHLS } from "./transcoder";
import { generateThumbnail } from "./thumbnail";
import { downloadFile, uploadDirectory, uploadFile } from "./s3";

const connection = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });

interface TranscodeJobData {
  videoId: string;
  orgId: string;
  sourceKey: string;
}

const worker = new Worker<TranscodeJobData>(
  "transcode",
  async (job) => {
    const { videoId, orgId, sourceKey } = job.data;
    const tmpDir = path.join(os.tmpdir(), "sp-transcode", videoId);

    console.log(`[Worker] Processing video ${videoId}`);

    try {
      // 1. Download source from S3
      await job.updateProgress(5);
      const inputPath = path.join(tmpDir, "source");
      await fs.mkdir(tmpDir, { recursive: true });

      console.log(`[Worker] Downloading source: ${sourceKey}`);
      await downloadFile(sourceKey, inputPath);
      await job.updateProgress(15);

      // 2. Probe video metadata
      console.log(`[Worker] Probing video...`);
      const probe = await probeVideo(inputPath);
      console.log(`[Worker] Video: ${probe.width}x${probe.height}, ${probe.duration.toFixed(1)}s, ${probe.codec}`);

      // Update DB with metadata
      await db.update(videos).set({
        duration: probe.duration,
        width: probe.width,
        height: probe.height,
        updatedAt: new Date(),
      }).where(eq(videos.id, videoId));

      await job.updateProgress(20);

      // 3. Generate poster thumbnail
      console.log(`[Worker] Generating thumbnail...`);
      const posterPath = await generateThumbnail(inputPath, tmpDir, probe.duration);
      const posterKey = `${orgId}/${videoId}/poster.jpg`;
      await uploadFile(posterPath, posterKey, "image/jpeg");
      console.log(`[Worker] ✅ Thumbnail uploaded`);

      await job.updateProgress(25);

      // 4. Transcode to HLS
      console.log(`[Worker] Starting HLS transcode...`);
      const hlsDir = path.join(tmpDir, "hls");
      const { results } = await transcodeToHLS(inputPath, hlsDir, probe.height);

      await job.updateProgress(80);

      // 5. Upload all HLS files to S3
      const hlsKeyPrefix = `${orgId}/${videoId}/hls`;
      console.log(`[Worker] Uploading HLS files...`);
      const uploadedCount = await uploadDirectory(hlsDir, hlsKeyPrefix);
      console.log(`[Worker] ✅ Uploaded ${uploadedCount} files`);

      await job.updateProgress(95);

      // 6. Update DB with final URLs
      const hlsUrl = `${config.CDN_URL}/${hlsKeyPrefix}/master.m3u8`;
      const posterUrl = `${config.CDN_URL}/${posterKey}`;

      const renditions = results.map((r) => ({
        quality: r.rendition.name,
        width: r.rendition.width,
        height: r.rendition.height,
        bitrate: parseInt(r.rendition.bitrate) * 1000,
        key: `${hlsKeyPrefix}/${r.rendition.name}/playlist.m3u8`,
      }));

      await db.update(videos).set({
        status: "ready",
        hlsKey: hlsKeyPrefix,
        hlsUrl,
        posterUrl,
        renditions,
        updatedAt: new Date(),
      }).where(eq(videos.id, videoId));

      await job.updateProgress(100);
      console.log(`[Worker] ✅ Video ${videoId} ready!`);

      return { hlsUrl, posterUrl, renditions: renditions.length };
    } catch (err) {
      console.error(`[Worker] ❌ Error processing ${videoId}:`, err);

      // Mark video as error
      await db.update(videos).set({
        status: "error",
        updatedAt: new Date(),
      }).where(eq(videos.id, videoId));

      throw err;
    } finally {
      // Cleanup temp files
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  },
  {
    connection,
    concurrency: 1, // One transcode at a time (CPU-bound)
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  }
);

worker.on("completed", (job) => {
  console.log(`[Worker] Job ${job.id} completed for video ${job.data.videoId}`);
});

worker.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});

worker.on("error", (err) => {
  console.error("[Worker] Worker error:", err);
});

console.log("🔧 SmartPlayer Transcode Worker started");
console.log(`   Redis: ${config.REDIS_URL}`);
console.log(`   Waiting for jobs on queue "transcode"...`);
