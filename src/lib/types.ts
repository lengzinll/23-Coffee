import { InferSelectModel } from "drizzle-orm";
import { user, event, register, socialMediaEvent, location } from "@/db/schema";

// ── Base Drizzle types (Date fields are real Date objects) ─────────────────
export type User = InferSelectModel<typeof user>;
export type Event = InferSelectModel<typeof event>;
export type Registration = InferSelectModel<typeof register>;
export type SocialMediaTask = InferSelectModel<typeof socialMediaEvent>;
export type Location = InferSelectModel<typeof location>;

// ── API-serialized types (Date fields come back as strings from JSON) ───────

/** Location as returned by the API (createdAt as string) */
export type ApiLocation = {
  id: number;
  name: string;
  mapUrl: string | null;
  createdAt: string | null;
};

/** User as returned by the API (no password, createdAt as string) */
export type ApiUser = {
  id: number;
  username: string;
  role: string;
  createdAt: string | null;
};

/** SocialMediaTask as returned by the API (createdAt serialized as string) */
export type ApiSocialMediaTask = {
  id: number;
  eventId: number;
  type: string;
  url: string;
  label: string | null;
  createdAt: string | null;
};

/**
 * Event row with registration counts as returned by GET /api/event.
 * date and createdAt come back as strings from JSON.
 */
export type ApiEventWithCounts = {
  id: number;
  name: string;
  description: string | null;
  date: string;
  status: string;
  createdAt: string | null;
  locationId: number | null;
  registrationCount: number;
  scannedCount: number;
  pendingCount: number;
};

/**
 * Registration row joined with event name (returned by GET /api/register).
 * agreedTerms is omitted by the join query; dates come back as strings.
 */
export type RegistrationWithEvent = {
  id: number;
  fullName: string;
  age: string;
  phone: string;
  position: string | null;
  scanned: boolean;
  socialProofs: string | null;
  eventId: number | null;
  eventName: string | null;
  playerId: string | null;
  totalScore: number | null;
  isLive: boolean | null;
  createdAt: string | null;
  /** Populated client-side when viewing proofs modal */
  socialMediaTasks?: ApiSocialMediaTask[];
};

/** Challenge score as returned by the live player endpoint */
export type ApiChallengeScore = {
  name: string;
  score: number;
};

/** Full live player data with challenges */
export type ApiLivePlayer = {
  id: number;
  fullName: string;
  age: string;
  position: string | null;
  profileImage: string | null;
  totalScore: number | null;
  playerId: string | null;
  eventId: number | null;
  challenges: ApiChallengeScore[];
};

/** WebSocket messaging protocol */
export type WebSocketMessage =
  | { type: "LIVE_PLAYER_CHANGED"; player: ApiLivePlayer }
  | { type: "SCORE_UPDATED"; player: ApiLivePlayer };

// ── Error types ────────────────────────────────────────────────────────────

/** Error thrown by registerFetcher — may carry per-task AI error map */
export interface RegisterError extends Error {
  taskErrors?: Record<string, string>;
}
