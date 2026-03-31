import { pgTable, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { videos } from "./videos";
import { organizations } from "./organizations";

export const players = pgTable("players", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  videoId: text("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  // Feature configs stored as JSONB for flexibility
  autoplayConfig: jsonb("autoplay_config").$type<{
    enabled: boolean;
    mutedMessage: string;
    clickMessage: string;
    overlayOpacity: number;
  }>().notNull().default({
    enabled: true,
    mutedMessage: "Your video has already started",
    clickMessage: "Click to listen",
    overlayOpacity: 0.85,
  }),

  progressBarConfig: jsonb("progress_bar_config").$type<{
    enabled: boolean;
    fictitious: boolean;
    fastPhaseEnd: number;
    slowPhaseEnd: number;
    fastPhaseDisplay: number;
    slowPhaseDisplay: number;
  }>().notNull().default({
    enabled: true,
    fictitious: true,
    fastPhaseEnd: 0.2,
    slowPhaseEnd: 0.8,
    fastPhaseDisplay: 0.5,
    slowPhaseDisplay: 0.85,
  }),

  recoveryThumbnailConfig: jsonb("recovery_thumbnail_config").$type<{
    enabled: boolean;
    imageUrl: string;
    delayMs: number;
    message?: string;
  }>().notNull().default({
    enabled: false,
    imageUrl: "",
    delayMs: 2000,
  }),

  resumePlayConfig: jsonb("resume_play_config").$type<{
    enabled: boolean;
    maxAgeDays: number;
    promptMessage: string;
  }>().notNull().default({
    enabled: true,
    maxAgeDays: 7,
    promptMessage: "Continue where you left off?",
  }),

  miniHookConfig: jsonb("mini_hook_config").$type<{
    enabled: boolean;
    hooks: Array<{
      type: string;
      triggerAtPercent: number;
      text: string;
      durationMs: number;
    }>;
  }>().notNull().default({ enabled: false, hooks: [] }),

  turboSpeedConfig: jsonb("turbo_speed_config").$type<{
    enabled: boolean;
    minSpeed: number;
    maxSpeed: number;
  }>().notNull().default({ enabled: false, minSpeed: 0.95, maxSpeed: 1.15 }),

  styleConfig: jsonb("style_config").$type<{
    primaryColor: string;
    backgroundColor: string;
    controlsBackground: string;
    controlsColor: string;
    fontFamily: string;
    borderRadius: number;
    showControls: boolean;
    controlsAutoHide: boolean;
    controlsAutoHideMs: number;
  }>().notNull().default({
    primaryColor: "#6366f1",
    backgroundColor: "#000000",
    controlsBackground: "rgba(0,0,0,0.7)",
    controlsColor: "#ffffff",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    borderRadius: 8,
    showControls: true,
    controlsAutoHide: true,
    controlsAutoHideMs: 3000,
  }),

  analyticsEnabled: boolean("analytics_enabled").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;
