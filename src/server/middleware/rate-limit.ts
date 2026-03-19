import rateLimit from "hono-rate-limit";
import type { MiddlewareHandler, Context } from "hono";

// General Rate Limiter (1000 requests per 15 minutes)
export const generalLimiter: MiddlewareHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  store: "local",
  message: "Too many requests, please try again later.",
  statusCode: 429,
});

// Strict Rate Limiter (Same for now, but can be adjusted later if needed)
export const strictLimiter: MiddlewareHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  store: "local",
  message: "Too many requests, please try again later.",
  statusCode: 429,
});
