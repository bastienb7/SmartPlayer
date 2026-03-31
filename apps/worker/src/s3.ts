import { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { config } from "./config";

export const s3 = new S3Client({
  endpoint: config.S3_ENDPOINT,
  region: config.S3_REGION,
  credentials: {
    accessKeyId: config.S3_ACCESS_KEY,
    secretAccessKey: config.S3_SECRET_KEY,
  },
  forcePathStyle: true,
});

/**
 * Download a file from S3 to local disk.
 */
export async function downloadFile(key: string, destPath: string): Promise<void> {
  const { Body } = await s3.send(new GetObjectCommand({
    Bucket: config.S3_BUCKET,
    Key: key,
  }));

  if (!Body || !(Body instanceof Readable)) {
    throw new Error(`Failed to download ${key}: no body`);
  }

  await fsp.mkdir(path.dirname(destPath), { recursive: true });
  const writeStream = fs.createWriteStream(destPath);
  await pipeline(Body as Readable, writeStream);
}

/**
 * Upload a single file to S3.
 */
export async function uploadFile(localPath: string, key: string, contentType: string): Promise<void> {
  const body = fs.createReadStream(localPath);
  const upload = new Upload({
    client: s3,
    params: {
      Bucket: config.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    },
  });
  await upload.done();
}

/**
 * Upload an entire directory to S3 recursively.
 */
export async function uploadDirectory(localDir: string, keyPrefix: string): Promise<number> {
  let count = 0;

  async function walk(dir: string) {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(localDir, fullPath);
      const key = `${keyPrefix}/${relativePath}`;

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else {
        const contentType = getContentType(entry.name);
        await uploadFile(fullPath, key, contentType);
        count++;
      }
    }
  }

  await walk(localDir);
  return count;
}

function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case ".m3u8": return "application/vnd.apple.mpegurl";
    case ".ts": return "video/MP2T";
    case ".mp4": return "video/mp4";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".png": return "image/png";
    case ".webp": return "image/webp";
    default: return "application/octet-stream";
  }
}
