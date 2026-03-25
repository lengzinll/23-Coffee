import { type InferSelectModel } from "drizzle-orm";
import { user, scanHistory } from "@/db/schema";

// ── Base Drizzle types (Date fields are real Date objects) ─────────────────
export type User = InferSelectModel<typeof user>;
export type Scan = InferSelectModel<typeof scanHistory>;

// ── API-serialized types (Date fields come back as strings from JSON) ───────

/** Helper to convert Date fields to string for API types */
type ApiType<T> = {
  [K in keyof T]: T[K] extends Date | null ? string | null : T[K];
};

/** User as returned by the API (no password, timestamp as string) */
export type ApiUser = ApiType<Omit<User, "password">>;

/** Scan as returned by the API (timestamp as string) */
export type ApiScan = ApiType<Scan>;

/** Joined result for scan with user */
export type ApiScanWithUser = {
  scan_history: ApiScan;
  user: ApiUser | null;
};

/** WebSocket messaging protocol */
export type WebSocketMessage =
  | { type: "SCAN_UPDATED"; scan: ApiScan };

// ── Error types ────────────────────────────────────────────────────────────

/** Error thrown by registerFetcher — may carry per-task AI error map */
export interface RegisterError extends Error {
  taskErrors?: Record<string, string>;
}
