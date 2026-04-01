import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, pixels, players } from "@smartplayer/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware, getOrgId } from "../middleware/auth";
import { cacheDel } from "../lib/redis";

const app = new Hono();
app.use("*", authMiddleware);

// List pixels for a player
app.get("/", async (c) => {
  const orgId = getOrgId(c);
  const playerId = c.req.query("playerId");
  if (!playerId) return c.json({ error: "playerId required" }, 400);

  const result = await db.query.pixels.findMany({
    where: and(eq(pixels.playerId, playerId), eq(pixels.orgId, orgId)),
  });
  return c.json({ pixels: result });
});

// Create pixel
const pixelSchema = z.object({
  playerId: z.string(),
  platform: z.enum(["facebook", "google", "tiktok"]),
  pixelId: z.string().min(1),
  events: z.array(z.object({
    eventName: z.string(),
    triggerTimestamp: z.number(),
  })).default([]),
});

app.post("/", zValidator("json", pixelSchema), async (c) => {
  const orgId = getOrgId(c);
  const data = c.req.valid("json");

  const [pixel] = await db.insert(pixels).values({ ...data, orgId }).returning();

  const player = await db.query.players.findFirst({ where: eq(players.id, data.playerId) });
  if (player) await cacheDel(`player:config:${player.videoId}`);

  return c.json(pixel, 201);
});

// Update pixel
app.patch("/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id")!;
  const body = await c.req.json();

  const [pixel] = await db.update(pixels)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(pixels.id, id), eq(pixels.orgId, orgId)))
    .returning();

  if (!pixel) return c.json({ error: "Not found" }, 404);
  return c.json(pixel);
});

// Delete pixel
app.delete("/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id")!;

  const [pixel] = await db.delete(pixels)
    .where(and(eq(pixels.id, id), eq(pixels.orgId, orgId)))
    .returning();

  if (!pixel) return c.json({ error: "Not found" }, 404);

  const player = await db.query.players.findFirst({ where: eq(players.id, pixel.playerId) });
  if (player) await cacheDel(`player:config:${player.videoId}`);

  return c.json({ deleted: true });
});

export { app as pixelRoutes };
