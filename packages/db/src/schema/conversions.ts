import { pgTable, text, timestamp, varchar, real, jsonb } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { videos } from "./videos";

export const conversionWebhooks = pgTable("conversion_webhooks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  platform: varchar("platform", { length: 50 }).notNull(), // stripe | hotmart | clickbank | kiwify | digistore | custom
  /** Secret for webhook signature verification */
  secret: text("secret"),
  /** Webhook endpoint path (auto-generated) */
  endpointPath: text("endpoint_path").notNull(),
  active: text("active").notNull().default("true"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const conversions = pgTable("conversions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  videoId: text("video_id").references(() => videos.id, { onDelete: "set null" }),
  webhookId: text("webhook_id").references(() => conversionWebhooks.id, { onDelete: "set null" }),
  /** Viewer fingerprint to match with analytics */
  viewerFingerprint: text("viewer_fingerprint"),
  sessionId: text("session_id"),
  /** Revenue amount */
  amount: real("amount").notNull().default(0),
  currency: varchar("currency", { length: 10 }).notNull().default("USD"),
  /** Platform transaction ID */
  transactionId: text("transaction_id"),
  /** Platform name */
  platform: varchar("platform", { length: 50 }).notNull(),
  /** UTM source for attribution */
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  /** A/B test variant attribution */
  variantId: text("variant_id"),
  headlineVariantId: text("headline_variant_id"),
  funnelStepVariantId: text("funnel_step_variant_id"),
  /** Raw webhook payload */
  rawPayload: jsonb("raw_payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ConversionWebhook = typeof conversionWebhooks.$inferSelect;
export type Conversion = typeof conversions.$inferSelect;
