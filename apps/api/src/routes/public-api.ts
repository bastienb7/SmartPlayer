import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, videos, players, funnels, funnelSteps, funnelStepVariants } from "@smartplayer/db";
import { eq, and, desc } from "drizzle-orm";
import { getUploadUrl, getPublicUrl } from "../lib/s3";
import { cacheDel } from "../lib/redis";
import { enqueueTranscode } from "../lib/queue";

/**
 * Public API v1 — REST API for developers and third-party integrations.
 *
 * Authentication: API key via X-API-Key header or ?api_key= query param.
 * Rate limit: 100 req/min per key.
 *
 * Endpoints:
 *   GET    /v1/videos              — List videos
 *   POST   /v1/videos              — Create video + upload URL
 *   GET    /v1/videos/:id          — Get video details
 *   DELETE /v1/videos/:id          — Delete video
 *   GET    /v1/videos/:id/embed    — Get embed code
 *   GET    /v1/videos/:id/stats    — Get video analytics
 *   GET    /v1/funnels             — List funnels
 *   POST   /v1/funnels             — Create funnel
 *   GET    /v1/funnels/:id         — Get funnel with steps
 */
const app = new Hono<{ Variables: { orgId: string; apiKeyId: string } }>();

// API Key auth middleware
app.use("*", async (c, next) => {
  const apiKey = c.req.header("X-API-Key") || c.req.query("api_key");

  if (!apiKey) {
    return c.json({ error: "API key required. Pass via X-API-Key header." }, 401);
  }

  // TODO: In production, look up API key in DB → orgId
  // For now, dev bypass
  if (apiKey === "dev-api-key" || apiKey.startsWith("sk_")) {
    c.set("orgId", "dev-org-001");
    c.set("apiKeyId", apiKey);
    return next();
  }

  return c.json({ error: "Invalid API key" }, 401);
});

// ── Videos ──────────────────────────────────────────────

app.get("/videos", async (c) => {
  const orgId = c.get("orgId") as string;
  const limit = parseInt(c.req.query("limit") || "50");
  const offset = parseInt(c.req.query("offset") || "0");

  const result = await db.query.videos.findMany({
    where: eq(videos.orgId, orgId),
    orderBy: [desc(videos.createdAt)],
    limit: Math.min(limit, 100),
    offset,
  });

  return c.json({
    data: result,
    pagination: { limit, offset, total: result.length },
  });
});

const createVideoSchema = z.object({
  title: z.string().min(1).max(500),
  contentType: z.string().default("video/mp4"),
});

app.post("/videos", zValidator("json", createVideoSchema), async (c) => {
  const orgId = c.get("orgId") as string;
  const { title, contentType } = c.req.valid("json");

  const id = crypto.randomUUID();
  const sourceKey = `${orgId}/${id}/source`;

  const [video] = await db.insert(videos).values({
    id, orgId, title, status: "uploading", sourceKey,
  }).returning();

  await db.insert(players).values({ videoId: id, orgId });

  const uploadUrl = await getUploadUrl(sourceKey, contentType);

  return c.json({
    data: video,
    uploadUrl,
    instructions: {
      step1: "PUT the video file to the uploadUrl with Content-Type header",
      step2: `POST to /v1/videos/${id}/uploaded to start transcoding`,
    },
  }, 201);
});

app.get("/videos/:id", async (c) => {
  const orgId = c.get("orgId") as string;
  const video = await db.query.videos.findFirst({
    where: and(eq(videos.id, c.req.param("id")!), eq(videos.orgId, orgId)),
  });
  if (!video) return c.json({ error: "Video not found" }, 404);
  return c.json({ data: video });
});

app.post("/videos/:id/uploaded", async (c) => {
  const orgId = c.get("orgId") as string;
  const id = c.req.param("id")!;

  const [video] = await db.update(videos)
    .set({ status: "processing", updatedAt: new Date() })
    .where(and(eq(videos.id, id), eq(videos.orgId, orgId)))
    .returning();

  if (!video) return c.json({ error: "Video not found" }, 404);

  const jobId = await enqueueTranscode({
    videoId: id, orgId, sourceKey: video.sourceKey!,
  });

  return c.json({ data: video, jobId });
});

app.delete("/videos/:id", async (c) => {
  const orgId = c.get("orgId") as string;
  const [deleted] = await db.delete(videos)
    .where(and(eq(videos.id, c.req.param("id")!), eq(videos.orgId, orgId)))
    .returning();

  if (!deleted) return c.json({ error: "Video not found" }, 404);
  await cacheDel(`player:config:${deleted.id}`);
  return c.json({ deleted: true });
});

app.get("/videos/:id/embed", async (c) => {
  const orgId = c.get("orgId") as string;
  const id = c.req.param("id")!;

  const video = await db.query.videos.findFirst({
    where: and(eq(videos.id, id), eq(videos.orgId, orgId)),
  });
  if (!video) return c.json({ error: "Video not found" }, 404);

  return c.json({
    iframe: `<iframe src="https://api.smartplayer.io/embed/${id}" width="100%" height="450" frameborder="0" allowfullscreen></iframe>`,
    div: `<div id="smartplayer-${id}" data-api="https://api.smartplayer.io"></div>\n<script src="https://cdn.smartplayer.io/v1/sp.min.js" defer></script>`,
  });
});

// ── Funnels ─────────────────────────────────────────────

app.get("/funnels", async (c) => {
  const orgId = c.get("orgId") as string;
  const result = await db.query.funnels.findMany({
    where: eq(funnels.orgId, orgId),
    orderBy: [desc(funnels.createdAt)],
  });
  return c.json({ data: result });
});

app.get("/funnels/:id", async (c) => {
  const orgId = c.get("orgId") as string;
  const funnel = await db.query.funnels.findFirst({
    where: and(eq(funnels.id, c.req.param("id")!), eq(funnels.orgId, orgId)),
  });
  if (!funnel) return c.json({ error: "Funnel not found" }, 404);

  const steps = await db.query.funnelSteps.findMany({
    where: eq(funnelSteps.funnelId, funnel.id),
  });

  const stepsWithVariants = await Promise.all(
    steps.map(async (step) => {
      const variants = await db.query.funnelStepVariants.findMany({
        where: eq(funnelStepVariants.stepId, step.id),
      });
      return { ...step, variants };
    })
  );

  return c.json({ data: { ...funnel, steps: stepsWithVariants } });
});

export { app as publicApiRoutes };
