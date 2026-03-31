export const config = {
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
  DATABASE_URL: process.env.DATABASE_URL || "postgresql://smartplayer:smartplayer@localhost:5432/smartplayer",

  S3_ENDPOINT: process.env.S3_ENDPOINT || "http://localhost:9002",
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY || "smartplayer",
  S3_SECRET_KEY: process.env.S3_SECRET_KEY || "smartplayer123",
  S3_BUCKET: process.env.S3_BUCKET || "smartplayer-videos",
  S3_REGION: process.env.S3_REGION || "us-east-1",
  CDN_URL: process.env.CDN_URL || "http://localhost:9002/smartplayer-videos",

  // FFmpeg
  FFMPEG_PATH: process.env.FFMPEG_PATH || "ffmpeg",
  FFPROBE_PATH: process.env.FFPROBE_PATH || "ffprobe",

  // Transcode settings
  RENDITIONS: [
    { name: "360p", width: 640, height: 360, bitrate: "800k", maxrate: "856k", bufsize: "1200k", audioBitrate: "96k" },
    { name: "480p", width: 854, height: 480, bitrate: "1400k", maxrate: "1498k", bufsize: "2100k", audioBitrate: "128k" },
    { name: "720p", width: 1280, height: 720, bitrate: "2800k", maxrate: "2996k", bufsize: "4200k", audioBitrate: "128k" },
    { name: "1080p", width: 1920, height: 1080, bitrate: "5000k", maxrate: "5350k", bufsize: "7500k", audioBitrate: "192k" },
  ],
} as const;

export type Rendition = (typeof config.RENDITIONS)[number];
