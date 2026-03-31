import { pgTable, text, timestamp, varchar, integer, real, jsonb } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const videos = pgTable("videos", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("uploading"),
  sourceKey: text("source_key"), // S3 key for original upload
  hlsKey: text("hls_key"), // S3 key prefix for HLS output
  hlsUrl: text("hls_url"),
  posterUrl: text("poster_url"),
  duration: real("duration"),
  width: integer("width"),
  height: integer("height"),
  sizeBytes: integer("size_bytes"),
  renditions: jsonb("renditions").$type<Array<{
    quality: string;
    width: number;
    height: number;
    bitrate: number;
    key: string;
  }>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;
