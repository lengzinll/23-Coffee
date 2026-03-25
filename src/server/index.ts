import { Hono } from "hono";

// Base application sharing state and bindings
const app = new Hono({ strict: false }).basePath("/api");

import authApp from "./routes/auth";
import userApp from "./routes/user";
import scanApp from "./routes/scan";
import wsApp from "./routes/ws";
import statsApp from "./routes/stats";
import { authMiddleware } from "./middleware/auth";
import { strictLimiter, generalLimiter } from "./middleware/rate-limit";
const routes = app
  // Rate limiters fire first — before auth
  .use("/auth/*", strictLimiter)
  .use("/user/*", generalLimiter)
  // Then auth check
  .use("*", authMiddleware)
  .route("/auth", authApp)
  .route("/user", userApp)
  .route("/scan", scanApp)
  .route("/ws", wsApp)
  .route("/stats", statsApp);

// Export types for frontend rpc - using the base app directly to ensure correct types setup
export type AppType = typeof routes;
export default app;
