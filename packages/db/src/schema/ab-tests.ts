import { pgTable, text, timestamp, varchar, jsonb, boolean, integer } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const abTests = pgTable("ab_tests", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // "video" | "headline" | "speed"
  status: varchar("status", { length: 20 }).notNull().default("draft"), // "draft" | "running" | "completed"
  variants: jsonb("variants").$type<Array<{
    id: string;
    name: string;
    weight: number; // traffic percentage 0-100
    // For video tests
    videoId?: string;
    // For headline tests
    headlineText?: string;
    // For speed tests
    playbackRate?: number;
  }>>().notNull().default([]),
  winnerVariantId: text("winner_variant_id"),
  totalSessions: integer("total_sessions").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ABTest = typeof abTests.$inferSelect;
export type NewABTest = typeof abTests.$inferInsert;
