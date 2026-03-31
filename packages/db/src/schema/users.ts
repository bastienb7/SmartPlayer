import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user ID
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  avatarUrl: text("avatar_url"),
  role: varchar("role", { length: 50 }).notNull().default("member"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
