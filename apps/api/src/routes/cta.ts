import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, ctas, players } from "@smartplayer/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware, getOrgId } from "../middleware/auth";
import { cacheDel } from "../lib/redis";

const app = new Hono();
app.use("*", authMiddleware);

const ctaSchema = z.object({
  playerId: z.string(),
  timestamp: z.number().min(0),
  duration: z.number().min(1).default(10),
  text: z.string().min(1).max(500),
  url: z.string().url(),
  buttonColor: z.string().optional(),
  buttonTextColor: z.string().optional(),
  openInNewTab: z.boolean().default(true),
  sortOrder: z.number().default(0),
});

// List CTAs for a player
app.get("/", async (c) => {
  const orgId = getOrgId(c);
  const playerId = c.req.query("playerId");
  if (!playerId) return c.json({ error: "playerId required" }, 400);

  const result = await db.query.ctas.findMany({
    where: and(eq(ctas.playerId, playerId), eq(ctas.orgId, orgId)),
    orderBy: (ctas, { asc }) => [asc(ctas.sortOrder)],
  });
  return c.json({ ctas: result });
});

// Create CTA
app.post("/", zValidator("json", ctaSchema), async (c) => {
  const orgId = getOrgId(c);
  const data = c.req.valid("json");

  const [cta] = await db.insert(ctas).values({ ...data, orgId }).returning();

  // Invalidate player config cache
  const player = await db.query.players.findFirst({ where: eq(players.id, data.playerId) });
  if (player) await cacheDel(`player:config:${player.videoId}`);

  return c.json(cta, 201);
});

// Update CTA
app.patch("/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();

  const [cta] = await db
    .update(ctas)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(ctas.id, c.req.param("id")!), eq(ctas.orgId, orgId)))
    .returning();

  if (!cta) return c.json({ error: "Not found" }, 404);
  return c.json(cta);
});

// Delete CTA
app.delete("/:id", async (c) => {
  const orgId = getOrgId(c);
  const [cta] = await db
    .delete(ctas)
    .where(and(eq(ctas.id, c.req.param("id")!), eq(ctas.orgId, orgId)))
    .returning();

  if (!cta) return c.json({ error: "Not found" }, 404);
  return c.json({ deleted: true });
});

export { app as ctaRoutes };
