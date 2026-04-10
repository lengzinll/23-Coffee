import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

const roleEnum = ["admin", "user"] as const;

export const user = sqliteTable("user", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: roleEnum }).notNull().default("user"),
  timestamp: integer("timestamp", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

const statusEnum = ["pending", "approved", "rejected", "redeemed"] as const;

export const scanHistory = sqliteTable("scan_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  user_id: integer("user_id").references(() => user.id, { onDelete: "cascade" }),
  status: text("status", { enum: statusEnum }).notNull().default("pending"),
  timestamp: integer("timestamp", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

export const systemSettings = sqliteTable("system_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});