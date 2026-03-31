import { Hono } from "hono";
import { db, players, videos, ctas, pixels } from "@smartplayer/db";
import { eq } from "drizzle-orm";
import { cacheGet, cacheSet } from "../lib/redis";
import { playerConfigRateLimit } from "../middleware/rateLimit";
import { env } from "../config/env";

const app = new Hono();

/**
 * GET /player/:videoId/config
 * Public endpoint — returns full player configuration.
 * Redis-cached for 60 seconds.
 */
app.get("/:videoId/config", playerConfigRateLimit, async (c) => {
  const videoId = c.req.param("videoId")!;
  const cacheKey = `player:config:${videoId}`;

  // Try cache first
  const cached = await cacheGet<object>(cacheKey);
  if (cached) {
    return c.json(cached);
  }

  // Fetch video
  const video = await db.query.videos.findFirst({
    where: eq(videos.id, videoId),
  });

  if (!video || video.status !== "ready") {
    return c.json({ error: "Video not found or not ready" }, 404);
  }

  // Fetch player config
  const player = await db.query.players.findFirst({
    where: eq(players.videoId, videoId),
  });

  if (!player) {
    return c.json({ error: "Player not configured" }, 404);
  }

  // Fetch CTAs
  const ctaList = await db.query.ctas.findMany({
    where: eq(ctas.playerId, player.id),
    orderBy: (ctas, { asc }) => [asc(ctas.sortOrder)],
  });

  // Fetch pixels
  const pixelList = await db.query.pixels.findMany({
    where: eq(pixels.playerId, player.id),
  });

  // Build pixel config
  const pixelConfig: Record<string, unknown> = { enabled: pixelList.length > 0, customEvents: [] };
  const allPixelEvents: Array<{ platform: string; eventName: string; triggerTimestamp: number }> = [];

  for (const px of pixelList) {
    if (px.platform === "facebook") pixelConfig.facebook = { pixelId: px.pixelId };
    if (px.platform === "google") pixelConfig.google = { measurementId: px.pixelId };
    if (px.platform === "tiktok") pixelConfig.tiktok = { pixelId: px.pixelId };

    for (const evt of (px.events || [])) {
      allPixelEvents.push({
        platform: px.platform,
        eventName: evt.eventName,
        triggerTimestamp: evt.triggerTimestamp,
      });
    }
  }
  pixelConfig.customEvents = allPixelEvents;

  // Build response
  const config = {
    videoId: video.id,
    hlsUrl: video.hlsUrl,
    posterUrl: video.posterUrl,
    autoplay: player.autoplayConfig,
    progressBar: player.progressBarConfig,
    cta: {
      enabled: ctaList.length > 0,
      triggers: ctaList.map((cta) => ({
        id: cta.id,
        timestamp: cta.timestamp,
        duration: cta.duration,
        text: cta.text,
        url: cta.url,
        buttonColor: cta.buttonColor,
        buttonTextColor: cta.buttonTextColor,
        openInNewTab: cta.openInNewTab,
      })),
    },
    recoveryThumbnail: player.recoveryThumbnailConfig,
    resumePlay: player.resumePlayConfig,
    headline: { enabled: false, variants: [] },
    miniHook: player.miniHookConfig,
    turboSpeed: player.turboSpeedConfig,
    abTest: { enabled: false },
    analytics: {
      enabled: player.analyticsEnabled,
      endpoint: `${env.API_URL}/analytics/events`,
      beaconEndpoint: `${env.API_URL}/analytics/beacon`,
      batchSize: 10,
      flushIntervalMs: 5000,
      heartbeatIntervalMs: 5000,
    },
    pixels: pixelConfig,
    style: player.styleConfig,
  };

  // Cache for 60 seconds
  await cacheSet(cacheKey, config, 60);

  return c.json(config);
});

export { app as playerRoutes };
