import { pgTable, text, timestamp, varchar, jsonb } from "drizzle-orm/pg-core";
import { players } from "./players";
import { organizations } from "./organizations";

export const pixels = pgTable("pixels", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  playerId: text("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  platform: varchar("platform", { length: 20 }).notNull(), // "facebook" | "google" | "tiktok"
  pixelId: text("pixel_id").notNull(), // platform-specific pixel/measurement ID
  events: jsonb("events").$type<Array<{
    eventName: string;
    triggerTimestamp: number;
  }>>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Pixel = typeof pixels.$inferSelect;
export type NewPixel = typeof pixels.$inferInsert;
