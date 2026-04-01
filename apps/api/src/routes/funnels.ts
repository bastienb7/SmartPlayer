import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, funnels, funnelSteps, funnelStepVariants, videos } from "@smartplayer/db";
import { eq, and, asc } from "drizzle-orm";
import { authMiddleware, getOrgId } from "../middleware/auth";

const app = new Hono();
app.use("*", authMiddleware);

// ── Funnel CRUD ─────────────────────────────────────────

// List funnels
app.get("/", async (c) => {
  const orgId = getOrgId(c);
  const result = await db.query.funnels.findMany({
    where: eq(funnels.orgId, orgId),
    orderBy: (f, { desc }) => [desc(f.createdAt)],
  });
  return c.json({ funnels: result });
});

// Get funnel with all steps + variants
app.get("/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id")!;

  const funnel = await db.query.funnels.findFirst({
    where: and(eq(funnels.id, id), eq(funnels.orgId, orgId)),
  });
  if (!funnel) return c.json({ error: "Not found" }, 404);

  const steps = await db.query.funnelSteps.findMany({
    where: eq(funnelSteps.funnelId, id),
    orderBy: [asc(funnelSteps.sortOrder)],
  });

  // Fetch variants for each step
  const stepsWithVariants = await Promise.all(
    steps.map(async (step) => {
      const variants = await db.query.funnelStepVariants.findMany({
        where: eq(funnelStepVariants.stepId, step.id),
      });
      return { ...step, variants };
    })
  );

  return c.json({ funnel, steps: stepsWithVariants });
});

// Create funnel
const createFunnelSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  combinedProgress: z.boolean().default(true),
  preloadSeconds: z.number().min(1).max(30).default(5),
});

app.post("/", zValidator("json", createFunnelSchema), async (c) => {
  const orgId = getOrgId(c);
  const data = c.req.valid("json");

  const [funnel] = await db.insert(funnels).values({ ...data, orgId }).returning();
  return c.json(funnel, 201);
});

// Update funnel
app.patch("/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();

  const [funnel] = await db.update(funnels)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(funnels.id, c.req.param("id")!), eq(funnels.orgId, orgId)))
    .returning();

  if (!funnel) return c.json({ error: "Not found" }, 404);
  return c.json(funnel);
});

// Delete funnel (cascades to steps + variants)
app.delete("/:id", async (c) => {
  const orgId = getOrgId(c);
  const [deleted] = await db.delete(funnels)
    .where(and(eq(funnels.id, c.req.param("id")!), eq(funnels.orgId, orgId)))
    .returning();

  if (!deleted) return c.json({ error: "Not found" }, 404);
  return c.json({ deleted: true });
});

// ── Step CRUD ───────────────────────────────────────────

const createStepSchema = z.object({
  funnelId: z.string(),
  name: z.string().min(1).max(255),
  category: z.enum(["hook", "body", "cta", "bonus", "custom"]).default("custom"),
  sortOrder: z.number().default(0),
});

app.post("/steps", zValidator("json", createStepSchema), async (c) => {
  const orgId = getOrgId(c);
  const data = c.req.valid("json");

  const [step] = await db.insert(funnelSteps).values({ ...data, orgId }).returning();
  return c.json(step, 201);
});

app.patch("/steps/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();

  const [step] = await db.update(funnelSteps)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(funnelSteps.id, c.req.param("id")!), eq(funnelSteps.orgId, orgId)))
    .returning();

  if (!step) return c.json({ error: "Not found" }, 404);
  return c.json(step);
});

app.delete("/steps/:id", async (c) => {
  const orgId = getOrgId(c);
  const [deleted] = await db.delete(funnelSteps)
    .where(and(eq(funnelSteps.id, c.req.param("id")!), eq(funnelSteps.orgId, orgId)))
    .returning();

  if (!deleted) return c.json({ error: "Not found" }, 404);
  return c.json({ deleted: true });
});

// ── Step Variant CRUD ───────────────────────────────────

const createVariantSchema = z.object({
  stepId: z.string(),
  videoId: z.string(),
  name: z.string().min(1).max(255),
  weight: z.number().min(0).max(100).default(100),
});

app.post("/steps/variants", zValidator("json", createVariantSchema), async (c) => {
  const orgId = getOrgId(c);
  const data = c.req.valid("json");

  const [variant] = await db.insert(funnelStepVariants).values({ ...data, orgId }).returning();
  return c.json(variant, 201);
});

app.patch("/steps/variants/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();

  const [variant] = await db.update(funnelStepVariants)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(funnelStepVariants.id, c.req.param("id")!), eq(funnelStepVariants.orgId, orgId)))
    .returning();

  if (!variant) return c.json({ error: "Not found" }, 404);
  return c.json(variant);
});

app.delete("/steps/variants/:id", async (c) => {
  const orgId = getOrgId(c);
  const [deleted] = await db.delete(funnelStepVariants)
    .where(and(eq(funnelStepVariants.id, c.req.param("id")!), eq(funnelStepVariants.orgId, orgId)))
    .returning();

  if (!deleted) return c.json({ error: "Not found" }, 404);
  return c.json({ deleted: true });
});

// ── A/B Test Controls per Step ──────────────────────────

// Start A/B test on a step
app.post("/steps/:id/start-test", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id")!;

  const [step] = await db.update(funnelSteps)
    .set({ abTestEnabled: true, abTestStatus: "running", updatedAt: new Date() })
    .where(and(eq(funnelSteps.id, id), eq(funnelSteps.orgId, orgId)))
    .returning();

  if (!step) return c.json({ error: "Not found" }, 404);
  return c.json(step);
});

// Stop A/B test
app.post("/steps/:id/stop-test", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id")!;

  const [step] = await db.update(funnelSteps)
    .set({ abTestStatus: "completed", updatedAt: new Date() })
    .where(and(eq(funnelSteps.id, id), eq(funnelSteps.orgId, orgId)))
    .returning();

  if (!step) return c.json({ error: "Not found" }, 404);
  return c.json(step);
});

// Declare winner for a step
app.post("/steps/:id/declare-winner", async (c) => {
  const orgId = getOrgId(c);
  const stepId = c.req.param("id")!;
  const { variantId } = await c.req.json();

  if (!variantId) return c.json({ error: "variantId required" }, 400);

  // Update step
  const [step] = await db.update(funnelSteps)
    .set({
      winnerVariantId: variantId,
      abTestStatus: "completed",
      updatedAt: new Date(),
    })
    .where(and(eq(funnelSteps.id, stepId), eq(funnelSteps.orgId, orgId)))
    .returning();

  if (!step) return c.json({ error: "Not found" }, 404);

  // Mark winner variant
  await db.update(funnelStepVariants)
    .set({ isWinner: true, updatedAt: new Date() })
    .where(eq(funnelStepVariants.id, variantId));

  // Eliminate all other variants for this step
  const allVariants = await db.query.funnelStepVariants.findMany({
    where: eq(funnelStepVariants.stepId, stepId),
  });
  for (const v of allVariants) {
    if (v.id !== variantId) {
      await db.update(funnelStepVariants)
        .set({ isEliminated: true, updatedAt: new Date() })
        .where(eq(funnelStepVariants.id, v.id));
    }
  }

  return c.json({ step, winnerId: variantId });
});

// ── Player Config Builder ───────────────────────────────

/**
 * GET /api/funnels/:id/player-config
 * Returns the funnel config for the player embed.
 * Handles per-step variant assignment (server-side, sticky).
 */
app.get("/:id/player-config", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id")!;

  const funnel = await db.query.funnels.findFirst({
    where: and(eq(funnels.id, id), eq(funnels.orgId, orgId)),
  });
  if (!funnel) return c.json({ error: "Not found" }, 404);

  const steps = await db.query.funnelSteps.findMany({
    where: eq(funnelSteps.funnelId, id),
    orderBy: [asc(funnelSteps.sortOrder)],
  });

  const configSteps = await Promise.all(
    steps.map(async (step) => {
      const variants = await db.query.funnelStepVariants.findMany({
        where: eq(funnelStepVariants.stepId, step.id),
      });

      // Filter out eliminated
      const active = variants.filter((v) => !v.isEliminated);

      // Assign variant
      let assigned: typeof active[0] | undefined;

      if (step.winnerVariantId) {
        // Test completed — always use winner
        assigned = active.find((v) => v.id === step.winnerVariantId);
      } else if (step.abTestEnabled && active.length > 1) {
        // Weighted random assignment
        const totalWeight = active.reduce((s, v) => s + v.weight, 0);
        let roll = Math.random() * totalWeight;
        for (const v of active) {
          roll -= v.weight;
          if (roll <= 0) { assigned = v; break; }
        }
      }

      if (!assigned) assigned = active[0];
      if (!assigned) return null;

      // Fetch video for HLS URL + duration
      const video = await db.query.videos.findFirst({
        where: eq(videos.id, assigned.videoId),
      });
      if (!video || !video.hlsUrl) return null;

      return {
        id: step.id,
        category: step.category,
        abTestId: step.abTestEnabled ? step.id : undefined,
        assignedVariant: {
          id: assigned.id,
          hlsUrl: video.hlsUrl,
          duration: video.duration || 0,
        },
        variants: active.map((v) => ({ id: v.id, weight: v.weight })),
      };
    })
  );

  // Filter out null steps (missing video)
  const validSteps = configSteps.filter(Boolean);

  return c.json({
    enabled: validSteps.length > 0,
    funnelId: funnel.id,
    steps: validSteps,
    combinedProgress: funnel.combinedProgress,
    preloadSeconds: funnel.preloadSeconds,
  });
});

export { app as funnelRoutes };
