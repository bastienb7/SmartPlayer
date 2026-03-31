import { pgTable, text, timestamp, varchar, real, integer, boolean } from "drizzle-orm/pg-core";
import { players } from "./players";
import { organizations } from "./organizations";

export const ctas = pgTable("ctas", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  playerId: text("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  timestamp: real("timestamp").notNull(), // seconds into video
  duration: integer("duration").notNull().default(10), // seconds to show
  text: varchar("text", { length: 500 }).notNull(),
  url: text("url").notNull(),
  buttonColor: varchar("button_color", { length: 20 }),
  buttonTextColor: varchar("button_text_color", { length: 20 }),
  openInNewTab: boolean("open_in_new_tab").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CTA = typeof ctas.$inferSelect;
export type NewCTA = typeof ctas.$inferInsert;
