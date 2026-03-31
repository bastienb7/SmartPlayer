import { Queue } from "bullmq";
import Redis from "ioredis";
import { env } from "../config/env";

const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

export const transcodeQueue = new Queue("transcode", { connection });

export interface TranscodeJobData {
  videoId: string;
  orgId: string;
  sourceKey: string;
}

export async function enqueueTranscode(data: TranscodeJobData): Promise<string> {
  const job = await transcodeQueue.add("transcode", data, {
    attempts: 2,
    backoff: { type: "exponential", delay: 30_000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  });
  return job.id!;
}
