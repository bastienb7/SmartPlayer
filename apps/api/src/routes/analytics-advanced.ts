import { Hono } from "hono";
import { clickhouseQuery } from "../lib/clickhouse";
import { authMiddleware, getOrgId } from "../middleware/auth";

const app = new Hono();
app.use("*", authMiddleware);

// ── Feature 4: Heatmap data ────────────────────────────

/**
 * GET /analytics/advanced/heatmap?videoId=X
 * Returns engagement intensity per progress bucket (5% intervals).
 * Used to render a color-coded heatmap on the video timeline.
 * Green = high retention, Red = drop-off
 */
app.get("/heatmap", async (c) => {
  const orgId = getOrgId(c);
  const videoId = c.req.query("videoId");
  if (!videoId) return c.json({ error: "videoId required" }, 400);

  const data = await clickhouseQuery<{
    progress_bucket: number;
    viewers: number;
    rewatches: number;
    seeks_to: number;
  }>(`
    SELECT
      intDiv(progress, 5) * 5 AS progress_bucket,
      uniqExact(session_id) AS viewers,
      countIf(type = 'seek') AS seeks_to,
      countIf(type = 'heartbeat') AS rewatches
    FROM smartplayer.events
    WHERE org_id = '${orgId}' AND video_id = '${videoId}'
      AND type IN ('heartbeat', 'progress', 'seek', 'complete')
    GROUP BY progress_bucket
    ORDER BY progress_bucket
  `);

  // Calculate intensity (0-100) relative to max viewers
  const maxViewers = Math.max(...data.map((d) => d.viewers), 1);
  const heatmap = data.map((d) => ({
    bucket: d.progress_bucket,
    intensity: Math.round((d.viewers / maxViewers) * 100),
    viewers: d.viewers,
    rewatches: d.rewatches,
    seeksTo: d.seeks_to,
  }));

  return c.json({ heatmap });
});

// ── Feature 9: Attention Score ─────────────────────────

/**
 * GET /analytics/advanced/attention?videoId=X
 * Calculates an attention score 0-100 per session based on:
 * - Retention (did they watch without skipping?)
 * - Pauses (fewer = higher attention)
 * - Tab switches (visibility changes)
 * - CTA interactions
 */
app.get("/attention", async (c) => {
  const orgId = getOrgId(c);
  const videoId = c.req.query("videoId");
  if (!videoId) return c.json({ error: "videoId required" }, 400);

  const sessions = await clickhouseQuery<{
    session_id: string;
    max_progress: number;
    play_count: number;
    pause_count: number;
    seek_count: number;
    cta_clicks: number;
    heartbeat_count: number;
    total_events: number;
  }>(`
    SELECT
      session_id,
      max(progress) AS max_progress,
      countIf(type = 'play') AS play_count,
      countIf(type = 'pause') AS pause_count,
      countIf(type = 'seek') AS seek_count,
      countIf(type = 'cta_click') AS cta_clicks,
      countIf(type = 'heartbeat') AS heartbeat_count,
      count() AS total_events
    FROM smartplayer.events
    WHERE org_id = '${orgId}' AND video_id = '${videoId}'
    GROUP BY session_id
    HAVING max_progress > 0
    ORDER BY max_progress DESC
    LIMIT 1000
  `);

  // Calculate attention score per session
  const scored = sessions.map((s) => {
    let score = 0;

    // Retention component (0-40 points)
    score += Math.min(40, (s.max_progress / 100) * 40);

    // Low pause penalty (0-20 points, more pauses = lower)
    const pausePenalty = Math.min(20, s.pause_count * 4);
    score += 20 - pausePenalty;

    // Low seek penalty (0-15 points, more seeks = lower)
    const seekPenalty = Math.min(15, s.seek_count * 5);
    score += 15 - seekPenalty;

    // Engagement bonus: heartbeats indicate continuous watching (0-15)
    const expectedHeartbeats = (s.max_progress / 100) * 20; // ~1 per 5%
    const heartbeatRatio = Math.min(1, s.heartbeat_count / Math.max(1, expectedHeartbeats));
    score += heartbeatRatio * 15;

    // CTA interaction bonus (0-10)
    score += Math.min(10, s.cta_clicks * 10);

    return {
      sessionId: s.session_id,
      score: Math.round(Math.max(0, Math.min(100, score))),
      maxProgress: s.max_progress,
      pauses: s.pause_count,
      seeks: s.seek_count,
      ctaClicks: s.cta_clicks,
    };
  });

  // Aggregate stats
  const scores = scored.map((s) => s.score);
  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  // Distribution buckets
  const distribution = [
    { range: "0-20", label: "Very Low", count: scores.filter((s) => s <= 20).length },
    { range: "21-40", label: "Low", count: scores.filter((s) => s > 20 && s <= 40).length },
    { range: "41-60", label: "Medium", count: scores.filter((s) => s > 40 && s <= 60).length },
    { range: "61-80", label: "High", count: scores.filter((s) => s > 60 && s <= 80).length },
    { range: "81-100", label: "Very High", count: scores.filter((s) => s > 80).length },
  ];

  return c.json({
    avgScore,
    totalSessions: scored.length,
    distribution,
    topSessions: scored.slice(0, 20),
    highAttentionCount: scores.filter((s) => s > 70).length,
  });
});

// ── Feature 10: A/B Comparison Real-time ───────────────

/**
 * GET /analytics/advanced/ab-comparison?videoId=X&testId=Y
 * Returns per-variant metrics with statistical significance.
 */
app.get("/ab-comparison", async (c) => {
  const orgId = getOrgId(c);
  const videoId = c.req.query("videoId");
  const testId = c.req.query("testId");

  if (!videoId) return c.json({ error: "videoId required" }, 400);

  // Get per-variant stats
  const variants = await clickhouseQuery<{
    variant_id: string;
    sessions: number;
    plays: number;
    completions: number;
    avg_progress: number;
    cta_clicks: number;
  }>(`
    SELECT
      coalesce(variant_id, headline_variant_id, 'control') AS variant_id,
      uniqExact(session_id) AS sessions,
      countIf(type = 'play') AS plays,
      countIf(type = 'complete') AS completions,
      avg(progress) AS avg_progress,
      countIf(type = 'cta_click') AS cta_clicks
    FROM smartplayer.events
    WHERE org_id = '${orgId}' AND video_id = '${videoId}'
      AND type IN ('play', 'complete', 'heartbeat', 'cta_click', 'progress')
    GROUP BY variant_id
    HAVING sessions > 0
    ORDER BY sessions DESC
  `);

  // Calculate conversion rates and confidence
  const results = variants.map((v) => {
    const convRate = v.sessions > 0 ? v.cta_clicks / v.sessions : 0;
    return {
      variantId: v.variant_id,
      sessions: v.sessions,
      plays: v.plays,
      completions: v.completions,
      completionRate: v.sessions > 0 ? (v.completions / v.sessions) * 100 : 0,
      avgProgress: v.avg_progress,
      ctaClicks: v.cta_clicks,
      conversionRate: convRate * 100,
    };
  });

  // Statistical significance (simplified Z-test between top 2)
  let confidence = 0;
  let suggestedWinner: string | null = null;

  if (results.length >= 2) {
    const [a, b] = results.sort((x, y) => y.conversionRate - x.conversionRate);
    const pA = a.conversionRate / 100;
    const pB = b.conversionRate / 100;
    const nA = a.sessions;
    const nB = b.sessions;

    if (nA > 0 && nB > 0 && (pA > 0 || pB > 0)) {
      const pooledP = (pA * nA + pB * nB) / (nA + nB);
      const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / nA + 1 / nB));
      const z = se > 0 ? Math.abs(pA - pB) / se : 0;

      // Z to confidence (approximate)
      if (z >= 2.576) confidence = 99;
      else if (z >= 1.96) confidence = 95;
      else if (z >= 1.645) confidence = 90;
      else if (z >= 1.28) confidence = 80;
      else confidence = Math.round(Math.min(79, z * 40));

      if (confidence >= 95) suggestedWinner = a.variantId;
    }
  }

  return c.json({
    variants: results,
    confidence,
    suggestedWinner,
    sampleSizeNeeded: confidence < 95
      ? estimateSampleSize(results[0]?.conversionRate || 5, results[1]?.conversionRate || 3)
      : 0,
  });
});

function estimateSampleSize(rateA: number, rateB: number): number {
  // Simplified sample size estimation for 95% confidence, 80% power
  const p1 = rateA / 100;
  const p2 = rateB / 100;
  const diff = Math.abs(p1 - p2);
  if (diff === 0) return 10000;
  const pooled = (p1 + p2) / 2;
  const n = Math.ceil((7.85 * pooled * (1 - pooled)) / (diff * diff));
  return Math.max(100, n);
}

// ── Feature 11: Traffic Source Cohorts (UTM) ───────────

/**
 * GET /analytics/advanced/cohorts?videoId=X
 * Returns analytics segmented by UTM source.
 */
app.get("/cohorts", async (c) => {
  const orgId = getOrgId(c);
  const videoId = c.req.query("videoId");

  const videoFilter = videoId ? `AND video_id = '${videoId}'` : "";

  const cohorts = await clickhouseQuery<{
    source: string;
    sessions: number;
    plays: number;
    completions: number;
    avg_progress: number;
    cta_clicks: number;
  }>(`
    SELECT
      coalesce(
        JSONExtractString(meta, 'utm_source'),
        if(device = 'mobile', 'mobile-direct', 'desktop-direct')
      ) AS source,
      uniqExact(session_id) AS sessions,
      countIf(type = 'play') AS plays,
      countIf(type = 'complete') AS completions,
      avgIf(progress, type IN ('heartbeat', 'complete')) AS avg_progress,
      countIf(type = 'cta_click') AS cta_clicks
    FROM smartplayer.events
    WHERE org_id = '${orgId}'
      ${videoFilter}
      AND type IN ('play', 'complete', 'heartbeat', 'cta_click', 'progress')
    GROUP BY source
    HAVING sessions > 0
    ORDER BY sessions DESC
    LIMIT 20
  `);

  const results = cohorts.map((co) => ({
    source: co.source,
    sessions: co.sessions,
    plays: co.plays,
    completions: co.completions,
    completionRate: co.sessions > 0 ? (co.completions / co.sessions) * 100 : 0,
    avgProgress: co.avg_progress,
    ctaClicks: co.cta_clicks,
    ctaRate: co.sessions > 0 ? (co.cta_clicks / co.sessions) * 100 : 0,
  }));

  return c.json({ cohorts: results });
});

export { app as analyticsAdvancedRoutes };
