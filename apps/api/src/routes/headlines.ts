import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, headlines, headlineVariants, players } from "@smartplayer/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware, getOrgId } from "../middleware/auth";
import { cacheDel } from "../lib/redis";

const app = new Hono();
app.use("*", authMiddleware);

// Get headline config for a player
app.get("/", async (c) => {
  const orgId = getOrgId(c);
  const playerId = c.req.query("playerId");
  if (!playerId) return c.json({ error: "playerId required" }, 400);

  const headline = await db.query.headlines.findFirst({
    where: and(eq(headlines.playerId, playerId), eq(headlines.orgId, orgId)),
  });

  if (!headline) return c.json({ headline: null, variants: [] });

  const variants = await db.query.headlineVariants.findMany({
    where: eq(headlineVariants.headlineId, headline.id),
    orderBy: (hv, { asc }) => [asc(hv.sortOrder)],
  });

  return c.json({ headline, variants });
});

// Create/update headline config
const headlineSchema = z.object({
  playerId: z.string(),
  abTestEnabled: z.boolean().default(false),
  includeNoHeadlineVariant: z.boolean().default(false),
  position: z.enum(["above", "below", "overlay-top", "overlay-bottom"]).default("above"),
  animation: z.enum(["none", "fade", "slide-down", "slide-up"]).default("fade"),
  targetSelector: z.string().optional(),
  mobileBreakpoint: z.number().default(768),
  clickUrl: z.string().optional(),
  clickOpenNewTab: z.boolean().default(false),
  minDays: z.number().default(3),
  minPlays: z.number().default(200),
  minConversions: z.number().default(20),
});

app.post("/", zValidator("json", headlineSchema), async (c) => {
  const orgId = getOrgId(c);
  const data = c.req.valid("json");

  // Upsert: check if one exists for this player
  const existing = await db.query.headlines.findFirst({
    where: and(eq(headlines.playerId, data.playerId), eq(headlines.orgId, orgId)),
  });

  let headlineRow;
  if (existing) {
    const [updated] = await db.update(headlines)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(headlines.id, existing.id))
      .returning();
    headlineRow = updated;
  } else {
    const [created] = await db.insert(headlines)
      .values({ ...data, orgId })
      .returning();
    headlineRow = created;
  }

  // Invalidate player config cache
  const player = await db.query.players.findFirst({ where: eq(players.id, data.playerId) });
  if (player) await cacheDel(`player:config:${player.videoId}`);

  return c.json(headlineRow, existing ? 200 : 201);
});

// CRUD for headline variants
const variantSchema = z.object({
  headlineId: z.string(),
  type: z.enum(["text", "image", "gif"]).default("text"),
  text: z.string().optional(),
  imageUrl: z.string().optional(),
  mobileImageUrl: z.string().optional(),
  altText: z.string().optional(),
  style: z.object({
    fontSize: z.string().optional(),
    fontWeight: z.string().optional(),
    color: z.string().optional(),
    backgroundColor: z.string().optional(),
    textAlign: z.string().optional(),
    padding: z.string().optional(),
    maxWidth: z.string().optional(),
  }).optional(),
  weight: z.number().default(100),
  sortOrder: z.number().default(0),
});

app.post("/variants", zValidator("json", variantSchema), async (c) => {
  const orgId = getOrgId(c);
  const data = c.req.valid("json");

  const [variant] = await db.insert(headlineVariants)
    .values({ ...data, orgId })
    .returning();

  return c.json(variant, 201);
});

app.patch("/variants/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id")!;
  const body = await c.req.json();

  const [variant] = await db.update(headlineVariants)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(headlineVariants.id, id), eq(headlineVariants.orgId, orgId)))
    .returning();

  if (!variant) return c.json({ error: "Not found" }, 404);
  return c.json(variant);
});

app.delete("/variants/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id")!;

  const [variant] = await db.delete(headlineVariants)
    .where(and(eq(headlineVariants.id, id), eq(headlineVariants.orgId, orgId)))
    .returning();

  if (!variant) return c.json({ error: "Not found" }, 404);
  return c.json({ deleted: true });
});

// Start/stop A/B test
app.post("/:id/start-test", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id")!;

  const [headline] = await db.update(headlines)
    .set({ abTestEnabled: true, abTestStatus: "running", updatedAt: new Date() })
    .where(and(eq(headlines.id, id), eq(headlines.orgId, orgId)))
    .returning();

  if (!headline) return c.json({ error: "Not found" }, 404);
  return c.json(headline);
});

app.post("/:id/stop-test", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id")!;

  const [headline] = await db.update(headlines)
    .set({ abTestStatus: "completed", updatedAt: new Date() })
    .where(and(eq(headlines.id, id), eq(headlines.orgId, orgId)))
    .returning();

  if (!headline) return c.json({ error: "Not found" }, 404);
  return c.json(headline);
});

// Declare winner manually
app.post("/:id/declare-winner", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id")!;
  const { variantId } = await c.req.json();

  // Mark winner
  const [headline] = await db.update(headlines)
    .set({
      winnerVariantId: variantId,
      abTestStatus: "completed",
      updatedAt: new Date(),
    })
    .where(and(eq(headlines.id, id), eq(headlines.orgId, orgId)))
    .returning();

  if (!headline) return c.json({ error: "Not found" }, 404);

  // Mark variant as winner, others as eliminated
  if (variantId !== "__none__") {
    await db.update(headlineVariants)
      .set({ isWinner: true })
      .where(eq(headlineVariants.id, variantId));

    // Eliminate others
    const allVariants = await db.query.headlineVariants.findMany({
      where: eq(headlineVariants.headlineId, id),
    });
    for (const v of allVariants) {
      if (v.id !== variantId) {
        await db.update(headlineVariants)
          .set({ isEliminated: true })
          .where(eq(headlineVariants.id, v.id));
      }
    }
  }

  return c.json(headline);
});

export { app as headlineRoutes };
