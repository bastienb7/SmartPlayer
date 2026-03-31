import { Hono } from "hono";
import { db, players, videos, ctas, pixels, headlines, headlineVariants } from "@smartplayer/db";
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
    headline: await buildHeadlineConfig(player.id),
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

/**
 * Build headline config for the player, including A/B variant assignment.
 */
async function buildHeadlineConfig(playerId: string) {
  const headline = await db.query.headlines.findFirst({
    where: eq(headlines.playerId, playerId),
  });

  if (!headline) {
    return {
      enabled: false,
      variants: [],
      abTestEnabled: false,
      includeNoHeadlineVariant: false,
      mobileBreakpoint: 768,
      position: "above" as const,
      animation: "fade" as const,
    };
  }

  const variants = await db.query.headlineVariants.findMany({
    where: eq(headlineVariants.headlineId, headline.id),
    orderBy: (hv, { asc }) => [asc(hv.sortOrder)],
  });

  // Filter out eliminated variants
  const activeVariants = variants.filter((v) => !v.isEliminated);

  // Assign variant (server-side for sticky assignment)
  let assignedVariantId: string | undefined;
  if (headline.winnerVariantId) {
    // Test completed — always show winner
    assignedVariantId = headline.winnerVariantId;
  } else if (headline.abTestEnabled && activeVariants.length > 0) {
    // Weighted random assignment
    const totalWeight = activeVariants.reduce((sum, v) => sum + v.weight, 0)
      + (headline.includeNoHeadlineVariant ? 100 : 0);
    let roll = Math.random() * totalWeight;

    if (headline.includeNoHeadlineVariant) {
      roll -= 100;
      if (roll <= 0) {
        assignedVariantId = "__none__";
      }
    }

    if (!assignedVariantId) {
      for (const v of activeVariants) {
        roll -= v.weight;
        if (roll <= 0) {
          assignedVariantId = v.id;
          break;
        }
      }
    }

    assignedVariantId = assignedVariantId || activeVariants[0]?.id;
  } else if (activeVariants.length > 0) {
    // No A/B test — show first variant
    assignedVariantId = activeVariants[0].id;
  }

  return {
    enabled: activeVariants.length > 0 || headline.includeNoHeadlineVariant,
    variants: activeVariants.map((v) => ({
      id: v.id,
      type: v.type,
      text: v.text,
      imageUrl: v.imageUrl,
      mobileImageUrl: v.mobileImageUrl,
      altText: v.altText,
      style: v.style,
      weight: v.weight,
    })),
    abTestEnabled: headline.abTestEnabled,
    abTestId: headline.id,
    includeNoHeadlineVariant: headline.includeNoHeadlineVariant,
    assignedVariantId,
    mobileBreakpoint: headline.mobileBreakpoint,
    position: headline.position,
    animation: headline.animation,
    targetSelector: headline.targetSelector,
    clickUrl: headline.clickUrl,
    clickOpenNewTab: headline.clickOpenNewTab,
  };
}

export { app as playerRoutes };
