export const env = {
  // Server
  PORT: parseInt(process.env.API_PORT || "3000"),
  NODE_ENV: process.env.NODE_ENV || "development",
  API_URL: process.env.API_URL || "http://localhost:3000",
  WEB_URL: process.env.WEB_URL || "http://localhost:3001",
  CDN_URL: process.env.CDN_URL || "http://localhost:9002/smartplayer-videos",

  // Database
  DATABASE_URL: process.env.DATABASE_URL || "postgresql://smartplayer:smartplayer@localhost:5432/smartplayer",

  // Redis
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",

  // ClickHouse
  CLICKHOUSE_URL: process.env.CLICKHOUSE_URL || "http://localhost:8123",
  CLICKHOUSE_USER: process.env.CLICKHOUSE_USER || "smartplayer",
  CLICKHOUSE_PASSWORD: process.env.CLICKHOUSE_PASSWORD || "smartplayer",
  CLICKHOUSE_DATABASE: process.env.CLICKHOUSE_DATABASE || "smartplayer",

  // S3
  S3_ENDPOINT: process.env.S3_ENDPOINT || "http://localhost:9002",
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY || "smartplayer",
  S3_SECRET_KEY: process.env.S3_SECRET_KEY || "smartplayer123",
  S3_BUCKET: process.env.S3_BUCKET || "smartplayer-videos",
  S3_REGION: process.env.S3_REGION || "us-east-1",

  // Auth
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || "",
  CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET || "",

  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "",
} as const;
