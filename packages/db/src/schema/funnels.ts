import { pgTable, text, timestamp, varchar, integer, boolean, real, jsonb } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { videos } from "./videos";

// ── Funnel ─────────────────────────────────────────────

export const funnels = pgTable("funnels", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft | active | paused
  /** Combined progress bar across all steps */
  combinedProgress: boolean("combined_progress").notNull().default(true),
  /** Pre-load next step N seconds before current ends */
  preloadSeconds: integer("preload_seconds").notNull().default(5),
  /** Total plays */
  totalPlays: integer("total_plays").notNull().default(0),
  /** Total completions (all steps) */
  totalCompletions: integer("total_completions").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Funnel Step ────────────────────────────────────────

export const funnelSteps = pgTable("funnel_steps", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  funnelId: text("funnel_id").notNull().references(() => funnels.id, { onDelete: "cascade" }),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  /** Step order (0-based) */
  sortOrder: integer("sort_order").notNull().default(0),
  /** Category for organization */
  category: varchar("category", { length: 20 }).notNull().default("custom"), // hook | body | cta | bonus | custom
  /** Display name */
  name: varchar("name", { length: 255 }).notNull(),
  /** A/B test status for this step */
  abTestEnabled: boolean("ab_test_enabled").notNull().default(false),
  abTestStatus: varchar("ab_test_status", { length: 20 }).notNull().default("draft"), // draft | running | completed
  /** Winner variant ID (null = no winner yet) */
  winnerVariantId: text("winner_variant_id"),
  /** A/B test thresholds */
  minPlays: integer("min_plays").notNull().default(200),
  minDays: integer("min_days").notNull().default(3),
  /** Denormalized stats */
  totalEntries: integer("total_entries").notNull().default(0),
  totalCompletions: integer("total_completions").notNull().default(0),
  dropOffRate: real("drop_off_rate").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Funnel Step Variant (each step can have multiple video variants) ──

export const funnelStepVariants = pgTable("funnel_step_variants", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  stepId: text("step_id").notNull().references(() => funnelSteps.id, { onDelete: "cascade" }),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  /** The video used for this variant */
  videoId: text("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  /** Display name (e.g. "Hook v1", "Hook v2") */
  name: varchar("name", { length: 255 }).notNull(),
  /** Traffic weight (percentage, default even split) */
  weight: integer("weight").notNull().default(100),
  /** Is this the winning variant? */
  isWinner: boolean("is_winner").notNull().default(false),
  /** Eliminated from test */
  isEliminated: boolean("is_eliminated").notNull().default(false),
  /** Denormalized stats */
  impressions: integer("impressions").notNull().default(0),
  completions: integer("completions").notNull().default(0),
  completionRate: real("completion_rate").notNull().default(0),
  /** Viewers who proceeded to next step */
  passThrough: integer("pass_through").notNull().default(0),
  passThroughRate: real("pass_through_rate").notNull().default(0),
  /** Conversions attributed (if conversion tracking enabled) */
  conversions: integer("conversions").notNull().default(0),
  conversionRate: real("conversion_rate").notNull().default(0),
  revenue: real("revenue").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Funnel = typeof funnels.$inferSelect;
export type NewFunnel = typeof funnels.$inferInsert;
export type FunnelStep = typeof funnelSteps.$inferSelect;
export type NewFunnelStep = typeof funnelSteps.$inferInsert;
export type FunnelStepVariant = typeof funnelStepVariants.$inferSelect;
export type NewFunnelStepVariant = typeof funnelStepVariants.$inferInsert;
