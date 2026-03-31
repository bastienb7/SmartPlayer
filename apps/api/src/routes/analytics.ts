import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { clickhouseInsert, clickhouseQuery } from "../lib/clickhouse";
import { analyticsRateLimit } from "../middleware/rateLimit";
import { authMiddleware, getOrgId } from "../middleware/auth";
import { db, videos } from "@smartplayer/db";
import { eq } from "drizzle-orm";

const app = new Hono();

// --- Public endpoints (no auth, used by the player embed) ---

const eventSchema = z.object({
  type: z.string(),
  videoId: z.string(),
  sessionId: z.string(),
  viewerFingerprint: z.string(),
  timestamp: z.number(),
  currentTime: z.number(),
  duration: z.number(),
  progress: z.number(),
  meta: z.record(z.unknown()).optional(),
  variantId: z.string().optional(),
  headlineVariantId: z.string().optional(),
  speedVariant: z.number().optional(),
});

const batchSchema = z.object({
  events: z.array(eventSchema).max(50),
  sentAt: z.number(),
});

// POST /analytics/events — batch event ingestion
app.post("/events", analyticsRateLimit, zValidator("json", batchSchema), async (c) => {
  const { events } = c.req.valid("json");
  if (events.length === 0) return c.json({ ok: true });

  // Look up org_id from video_id (use first event)
  const videoId = events[0].videoId;
  const video = await db.query.videos.findFirst({
    where: eq(videos.id, videoId),
    columns: { orgId: true },
  });
  const orgId = video?.orgId || "unknown";

  // Parse user-agent for device/browser info
  const ua = c.req.header("user-agent") || "";
  const device = /Mobile|Android|iPhone/i.test(ua) ? "mobile" : "desktop";
  const browser = parseBrowser(ua);

  const rows = events.map((e) => ({
    type: e.type,
    video_id: e.videoId,
    org_id: orgId,
    session_id: e.sessionId,
    viewer_fingerprint: e.viewerFingerprint,
    timestamp: new Date(e.timestamp).toISOString().replace("T", " ").replace("Z", ""),
    current_time: e.currentTime,
    duration: e.duration,
    progress: Math.min(100, Math.max(0, e.progress)),
    variant_id: e.variantId || null,
    headline_variant_id: e.headlineVariantId || null,
    speed_variant: e.speedVariant || null,
    meta: e.meta ? JSON.stringify(e.meta) : "{}",
    country: "",
    device,
    browser,
  }));

  try {
    await clickhouseInsert("smartplayer.events", rows);
  } catch (err) {
    console.error("[Analytics] Insert error:", err);
    // Don't fail the request — analytics should never break the player
  }

  return c.json({ ok: true, count: events.length });
});

// POST /analytics/beacon — sendBeacon endpoint (same logic, tolerates non-JSON)
app.post("/beacon", analyticsRateLimit, async (c) => {
  try {
    const body = await c.req.json();
    const parsed = batchSchema.safeParse(body);
    if (!parsed.success) return c.json({ ok: false }, 400);

    // Reuse events logic
    const { events } = parsed.data;
    if (events.length === 0) return c.json({ ok: true });

    const videoId = events[0].videoId;
    const video = await db.query.videos.findFirst({
      where: eq(videos.id, videoId),
      columns: { orgId: true },
    });

    const ua = c.req.header("user-agent") || "";
    const rows = events.map((e) => ({
      type: e.type,
      video_id: e.videoId,
      org_id: video?.orgId || "unknown",
      session_id: e.sessionId,
      viewer_fingerprint: e.viewerFingerprint,
      timestamp: new Date(e.timestamp).toISOString().replace("T", " ").replace("Z", ""),
      current_time: e.currentTime,
      duration: e.duration,
      progress: Math.min(100, Math.max(0, e.progress)),
      variant_id: e.variantId || null,
      headline_variant_id: e.headlineVariantId || null,
      speed_variant: e.speedVariant || null,
      meta: e.meta ? JSON.stringify(e.meta) : "{}",
      country: "",
      device: /Mobile|Android|iPhone/i.test(ua) ? "mobile" : "desktop",
      browser: parseBrowser(ua),
    }));

    await clickhouseInsert("smartplayer.events", rows);
    return c.json({ ok: true });
  } catch {
    return c.json({ ok: true }); // Never fail beacon
  }
});

// --- Authenticated endpoints (dashboard) ---

// GET /analytics/overview?videoId=xxx&from=2024-01-01&to=2024-12-31
app.get("/overview", authMiddleware, async (c) => {
  const orgId = getOrgId(c);
  const videoId = c.req.query("videoId");
  const from = c.req.query("from") || "2020-01-01";
  const to = c.req.query("to") || "2099-12-31";

  const videoFilter = videoId ? `AND video_id = '${videoId}'` : "";

  const stats = await clickhouseQuery<{
    total_plays: number;
    total_completions: number;
    unique_viewers: number;
    avg_progress: number;
    total_cta_clicks: number;
  }>(`
    SELECT
      sum(plays) AS total_plays,
      sum(completions) AS total_completions,
      uniqExact(unique_viewers) AS unique_viewers,
      avg(avg_progress) AS avg_progress,
      sum(cta_clicks) AS total_cta_clicks
    FROM smartplayer.video_stats_daily_mv
    WHERE org_id = '${orgId}'
      ${videoFilter}
      AND date >= '${from}'
      AND date <= '${to}'
  `);

  return c.json(stats[0] || {
    total_plays: 0,
    total_completions: 0,
    unique_viewers: 0,
    avg_progress: 0,
    total_cta_clicks: 0,
  });
});

// GET /analytics/retention?videoId=xxx
app.get("/retention", authMiddleware, async (c) => {
  const orgId = getOrgId(c);
  const videoId = c.req.query("videoId");
  if (!videoId) return c.json({ error: "videoId required" }, 400);

  const data = await clickhouseQuery<{
    progress_bucket: number;
    viewers: number;
  }>(`
    SELECT
      progress_bucket,
      sum(viewers) AS viewers
    FROM smartplayer.retention_mv
    WHERE org_id = '${orgId}' AND video_id = '${videoId}'
    GROUP BY progress_bucket
    ORDER BY progress_bucket
  `);

  return c.json({ retention: data });
});

// GET /analytics/daily?videoId=xxx&from=&to=
app.get("/daily", authMiddleware, async (c) => {
  const orgId = getOrgId(c);
  const videoId = c.req.query("videoId");
  const from = c.req.query("from") || "2020-01-01";
  const to = c.req.query("to") || "2099-12-31";

  const videoFilter = videoId ? `AND video_id = '${videoId}'` : "";

  const data = await clickhouseQuery<{
    date: string;
    plays: number;
    completions: number;
    unique_viewers: number;
    cta_clicks: number;
  }>(`
    SELECT
      date,
      sum(plays) AS plays,
      sum(completions) AS completions,
      sum(unique_viewers) AS unique_viewers,
      sum(cta_clicks) AS cta_clicks
    FROM smartplayer.video_stats_daily_mv
    WHERE org_id = '${orgId}'
      ${videoFilter}
      AND date >= '${from}'
      AND date <= '${to}'
    GROUP BY date
    ORDER BY date
  `);

  return c.json({ daily: data });
});

function parseBrowser(ua: string): string {
  if (ua.includes("Firefox")) return "firefox";
  if (ua.includes("Edg")) return "edge";
  if (ua.includes("Chrome")) return "chrome";
  if (ua.includes("Safari")) return "safari";
  return "other";
}

export { app as analyticsRoutes };
