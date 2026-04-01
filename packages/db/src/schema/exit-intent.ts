import { pgTable, text, timestamp, varchar, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { players } from "./players";
import { organizations } from "./organizations";

export const exitIntents = pgTable("exit_intents", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  playerId: text("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  // Content
  message: text("message").notNull().default("Wait! You're about to miss something important..."),
  subMessage: text("sub_message"),
  buttonText: varchar("button_text", { length: 255 }).notNull().default("Continue Watching"),
  imageUrl: text("image_url"),

  // Styling
  backgroundColor: varchar("background_color", { length: 20 }).default("#1a1a2e"),
  textColor: varchar("text_color", { length: 20 }).default("#ffffff"),
  buttonColor: varchar("button_color", { length: 20 }),

  // Triggers
  triggerOnMouseLeave: boolean("trigger_on_mouse_leave").notNull().default(true),
  triggerOnTabSwitch: boolean("trigger_on_tab_switch").notNull().default(true),
  triggerOnBackButton: boolean("trigger_on_back_button").notNull().default(false),
  triggerOnIdle: boolean("trigger_on_idle").notNull().default(false),
  idleTimeoutSeconds: integer("idle_timeout_seconds").notNull().default(30),

  // Guards
  maxShowsPerSession: integer("max_shows_per_session").notNull().default(1),
  minWatchSeconds: integer("min_watch_seconds").notNull().default(30),

  // Context-aware messages
  pitchTimestamp: integer("pitch_timestamp"), // seconds
  contextMessages: jsonb("context_messages").$type<{
    beforePitch?: string;
    duringPitch?: string;
    afterPitch?: string;
  }>(),

  // Analytics (denormalized)
  totalShows: integer("total_shows").notNull().default(0),
  totalDismisses: integer("total_dismisses").notNull().default(0),
  totalRecoveries: integer("total_recoveries").notNull().default(0),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ExitIntentRow = typeof exitIntents.$inferSelect;
export type NewExitIntent = typeof exitIntents.$inferInsert;
