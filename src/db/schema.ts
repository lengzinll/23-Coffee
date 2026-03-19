import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("admin"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

export const location = sqliteTable("location", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  mapUrl: text("map_url"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

export const event = sqliteTable("event", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  date: integer("date", { mode: "timestamp" }).notNull(),
  status: text("status").notNull().default("inactive"), // 'active' or 'inactive'
  locationId: integer("location_id").references(() => location.id, {
    onDelete: "set null",
  }),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

export const register = sqliteTable("register", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fullName: text("full_name").notNull(),
  age: text("age").notNull(),
  phone: text("phone").notNull(),
  agreedTerms: integer("agreed_terms", { mode: "boolean" })
    .notNull()
    .default(false),
  scanned: integer("scanned", { mode: "boolean" }).notNull().default(false),

  // New dynamic field for multiple proofs (stores JSON)
  socialProofs: text("social_proofs"),

  // Football position
  position: text("position"),

  // Profile Image URL
  profileImage: text("profile_image"),

  // Sequential Player ID (e.g., NPL-001)
  playerId: text("player_id"),

  eventId: integer("event_id").references(() => event.id, {
    onDelete: "cascade",
  }),

  totalScore: integer("total_score").default(0),
  isLive: integer("is_live", { mode: "boolean" }).default(false),

  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

export const socialMediaEvent = sqliteTable("social_media_event", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventId: integer("event_id")
    .notNull()
    .references(() => event.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'facebook', 'tiktok', 'telegram' (using string for flexibility, validated by enum in code)
  url: text("url").notNull(),
  label: text("label"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

export const challenge = sqliteTable("challenge", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventId: integer("event_id")
    .notNull()
    .references(() => event.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

export const challengeScore = sqliteTable("challenge_score", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  registerId: integer("register_id")
    .notNull()
    .references(() => register.id, { onDelete: "cascade" }),
  challengeId: integer("challenge_id")
    .notNull()
    .references(() => challenge.id, { onDelete: "cascade" }),
  score: integer("score").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});
