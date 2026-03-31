import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, videos, players } from "@smartplayer/db";
import { eq, and, desc } from "drizzle-orm";
import { authMiddleware, getOrgId } from "../middleware/auth";
import { getUploadUrl } from "../lib/s3";
import { cacheDel } from "../lib/redis";

const app = new Hono();
app.use("*", authMiddleware);

// List videos
app.get("/", async (c) => {
  const orgId = getOrgId(c);
  const result = await db.query.videos.findMany({
    where: eq(videos.orgId, orgId),
    orderBy: [desc(videos.createdAt)],
  });
  return c.json({ videos: result });
});

// Get single video
app.get("/:id", async (c) => {
  const orgId = getOrgId(c);
  const video = await db.query.videos.findFirst({
    where: and(eq(videos.id, c.req.param("id")!), eq(videos.orgId, orgId)),
  });
  if (!video) return c.json({ error: "Not found" }, 404);
  return c.json(video);
});

// Create video + get upload URL
const createSchema = z.object({
  title: z.string().min(1).max(500),
  contentType: z.string().default("video/mp4"),
});

app.post("/", zValidator("json", createSchema), async (c) => {
  const orgId = getOrgId(c);
  const { title, contentType } = c.req.valid("json");

  const id = crypto.randomUUID();
  const sourceKey = `${orgId}/${id}/source`;

  // Create video record
  const [video] = await db.insert(videos).values({
    id,
    orgId,
    title,
    status: "uploading",
    sourceKey,
  }).returning();

  // Create default player config
  await db.insert(players).values({
    videoId: id,
    orgId,
  });

  // Get presigned upload URL
  const uploadUrl = await getUploadUrl(sourceKey, contentType);

  return c.json({ video, uploadUrl }, 201);
});

// Confirm upload complete → trigger transcoding
app.post("/:id/uploaded", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id")!;

  const [video] = await db
    .update(videos)
    .set({ status: "processing", updatedAt: new Date() })
    .where(and(eq(videos.id, id), eq(videos.orgId, orgId)))
    .returning();

  if (!video) return c.json({ error: "Not found" }, 404);

  // TODO: Enqueue BullMQ transcode job
  // await transcodeQueue.add("transcode", { videoId: id, orgId });

  return c.json(video);
});

// Update video
const updateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
});

app.patch("/:id", zValidator("json", updateSchema), async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id")!;
  const updates = c.req.valid("json");

  const [video] = await db
    .update(videos)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(videos.id, id), eq(videos.orgId, orgId)))
    .returning();

  if (!video) return c.json({ error: "Not found" }, 404);
  return c.json(video);
});

// Delete video
app.delete("/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id")!;

  const [video] = await db
    .delete(videos)
    .where(and(eq(videos.id, id), eq(videos.orgId, orgId)))
    .returning();

  if (!video) return c.json({ error: "Not found" }, 404);

  // Invalidate player config cache
  await cacheDel(`player:config:${id}`);

  return c.json({ deleted: true });
});

// Get/Update player config
app.get("/:id/player", async (c) => {
  const orgId = getOrgId(c);
  const videoId = c.req.param("id")!;

  const player = await db.query.players.findFirst({
    where: and(eq(players.videoId, videoId), eq(players.orgId, orgId)),
  });
  if (!player) return c.json({ error: "Not found" }, 404);
  return c.json(player);
});

app.patch("/:id/player", async (c) => {
  const orgId = getOrgId(c);
  const videoId = c.req.param("id")!;
  const body = await c.req.json();

  const [player] = await db
    .update(players)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(players.videoId, videoId), eq(players.orgId, orgId)))
    .returning();

  if (!player) return c.json({ error: "Not found" }, 404);

  // Invalidate cache
  await cacheDel(`player:config:${videoId}`);

  return c.json(player);
});

export { app as videoRoutes };
