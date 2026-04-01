import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, exitIntents, players } from "@smartplayer/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware, getOrgId } from "../middleware/auth";
import { cacheDel } from "../lib/redis";

const app = new Hono();
app.use("*", authMiddleware);

// Get exit-intent config for a player
app.get("/", async (c) => {
  const orgId = getOrgId(c);
  const playerId = c.req.query("playerId");
  if (!playerId) return c.json({ error: "playerId required" }, 400);

  const config = await db.query.exitIntents.findFirst({
    where: and(eq(exitIntents.playerId, playerId), eq(exitIntents.orgId, orgId)),
  });

  return c.json({ exitIntent: config || null });
});

// Create or update exit-intent config
const exitIntentSchema = z.object({
  playerId: z.string(),
  message: z.string().min(1).default("Wait! You're about to miss something important..."),
  subMessage: z.string().optional(),
  buttonText: z.string().min(1).default("Continue Watching"),
  imageUrl: z.string().url().optional().or(z.literal("")),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  buttonColor: z.string().optional(),
  triggerOnMouseLeave: z.boolean().default(true),
  triggerOnTabSwitch: z.boolean().default(true),
  triggerOnBackButton: z.boolean().default(false),
  triggerOnIdle: z.boolean().default(false),
  idleTimeoutSeconds: z.number().min(5).default(30),
  maxShowsPerSession: z.number().min(1).max(5).default(1),
  minWatchSeconds: z.number().min(0).default(30),
  pitchTimestamp: z.number().optional(),
  contextMessages: z.object({
    beforePitch: z.string().optional(),
    duringPitch: z.string().optional(),
    afterPitch: z.string().optional(),
  }).optional(),
});

app.post("/", zValidator("json", exitIntentSchema), async (c) => {
  const orgId = getOrgId(c);
  const data = c.req.valid("json");

  // Upsert
  const existing = await db.query.exitIntents.findFirst({
    where: and(eq(exitIntents.playerId, data.playerId), eq(exitIntents.orgId, orgId)),
  });

  let result;
  if (existing) {
    const [updated] = await db.update(exitIntents)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(exitIntents.id, existing.id))
      .returning();
    result = updated;
  } else {
    const [created] = await db.insert(exitIntents)
      .values({ ...data, orgId })
      .returning();
    result = created;
  }

  // Invalidate player config cache
  const player = await db.query.players.findFirst({ where: eq(players.id, data.playerId) });
  if (player) await cacheDel(`player:config:${player.videoId}`);

  return c.json(result, existing ? 200 : 201);
});

// Delete exit-intent config
app.delete("/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id")!;

  const [deleted] = await db.delete(exitIntents)
    .where(and(eq(exitIntents.id, id), eq(exitIntents.orgId, orgId)))
    .returning();

  if (!deleted) return c.json({ error: "Not found" }, 404);

  // Invalidate cache
  const player = await db.query.players.findFirst({ where: eq(players.id, deleted.playerId) });
  if (player) await cacheDel(`player:config:${player.videoId}`);

  return c.json({ deleted: true });
});

export { app as exitIntentRoutes };
