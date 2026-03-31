import { pgTable, text, timestamp, varchar, integer, boolean, jsonb, real } from "drizzle-orm/pg-core";
import { players } from "./players";
import { organizations } from "./organizations";

export const headlines = pgTable("headlines", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  playerId: text("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  // A/B Test settings
  abTestEnabled: boolean("ab_test_enabled").notNull().default(false),
  abTestStatus: varchar("ab_test_status", { length: 20 }).notNull().default("draft"), // draft | running | completed
  includeNoHeadlineVariant: boolean("include_no_headline_variant").notNull().default(false),
  winnerVariantId: text("winner_variant_id"),

  // A/B Test thresholds
  minDays: integer("min_days").notNull().default(3),
  minPlays: integer("min_plays").notNull().default(200),
  minConversions: integer("min_conversions").notNull().default(20),

  // Display settings
  position: varchar("position", { length: 20 }).notNull().default("above"), // above | below | overlay-top | overlay-bottom
  animation: varchar("animation", { length: 20 }).notNull().default("fade"), // none | fade | slide-down | slide-up
  targetSelector: text("target_selector"),
  mobileBreakpoint: integer("mobile_breakpoint").notNull().default(768),
  clickUrl: text("click_url"),
  clickOpenNewTab: boolean("click_open_new_tab").notNull().default(false),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const headlineVariants = pgTable("headline_variants", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  headlineId: text("headline_id").notNull().references(() => headlines.id, { onDelete: "cascade" }),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  type: varchar("type", { length: 10 }).notNull().default("text"), // text | image | gif
  text: text("text"),
  imageUrl: text("image_url"),
  mobileImageUrl: text("mobile_image_url"),
  altText: varchar("alt_text", { length: 500 }),

  // Text styling (JSON)
  style: jsonb("style").$type<{
    fontSize?: string;
    fontWeight?: string;
    color?: string;
    backgroundColor?: string;
    textAlign?: string;
    padding?: string;
    maxWidth?: string;
  }>(),

  // A/B Test traffic weight (percentage, default even split)
  weight: integer("weight").notNull().default(100),
  sortOrder: integer("sort_order").notNull().default(0),

  // A/B Test aggregated stats (denormalized for fast reads)
  impressions: integer("impressions").notNull().default(0),
  plays: integer("plays").notNull().default(0),
  conversions: integer("conversions").notNull().default(0),
  conversionRate: real("conversion_rate").notNull().default(0),
  isWinner: boolean("is_winner").notNull().default(false),
  isEliminated: boolean("is_eliminated").notNull().default(false),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Headline = typeof headlines.$inferSelect;
export type NewHeadline = typeof headlines.$inferInsert;
export type HeadlineVariantRow = typeof headlineVariants.$inferSelect;
export type NewHeadlineVariant = typeof headlineVariants.$inferInsert;
