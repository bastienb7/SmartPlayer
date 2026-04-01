import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { logger } from "hono/logger";
import { corsMiddleware } from "./middleware/cors";
import { playerRoutes } from "./routes/player";
import { videoRoutes } from "./routes/videos";
import { analyticsRoutes } from "./routes/analytics";
import { ctaRoutes } from "./routes/cta";
import { headlineRoutes } from "./routes/headlines";
import { embedRoutes } from "./routes/embed";
import { exitIntentRoutes } from "./routes/exit-intent";
import { env } from "./config/env";

const app = new Hono();

// Global middleware
app.use("*", logger());
app.use("*", corsMiddleware);

// Health check
app.get("/health", (c) => c.json({
  status: "ok",
  service: "smartplayer-api",
  version: "0.1.0",
  env: env.NODE_ENV,
}));

// Public routes (no auth)
app.route("/player", playerRoutes);
app.route("/analytics", analyticsRoutes);
app.route("/embed", embedRoutes);

// Authenticated routes
app.route("/api/videos", videoRoutes);
app.route("/api/cta", ctaRoutes);
app.route("/api/headlines", headlineRoutes);
app.route("/api/exit-intent", exitIntentRoutes);

// 404 handler
app.notFound((c) => c.json({ error: "Not found" }, 404));

// Error handler
app.onError((err, c) => {
  console.error("[API Error]", err);
  return c.json({ error: "Internal server error" }, 500);
});

// Start server
console.log(`🚀 SmartPlayer API starting on port ${env.PORT}...`);

serve({
  fetch: app.fetch,
  port: env.PORT,
}, (info) => {
  console.log(`✅ SmartPlayer API running at http://localhost:${info.port}`);
  console.log(`   Environment: ${env.NODE_ENV}`);
  console.log(`   Player config: GET /player/:videoId/config`);
  console.log(`   Analytics:     POST /analytics/events`);
  console.log(`   Videos API:    /api/videos`);
});

export default app;
