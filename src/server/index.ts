import { Hono } from "hono";

// Base application sharing state and bindings
const app = new Hono({ strict: false }).basePath("/api");

import authApp from "./routes/auth";
import registerApp from "./routes/register";
import userApp from "./routes/user";
import eventApp from "./routes/event";
import locationApp from "./routes/location";
import wsApp from "./routes/ws";
import challengeApp from "./routes/challenge";
import { authMiddleware } from "./middleware/auth";
import { strictLimiter, generalLimiter } from "./middleware/rate-limit";
const routes = app
  // Rate limiters fire first — before auth
  .use("/auth/*", strictLimiter)
  .use("/register/*", strictLimiter)
  .use("/user/*", generalLimiter)
  .use("/event/*", generalLimiter)
  .use("/location/*", generalLimiter)
  // Then auth check
  .use("*", authMiddleware)
  .route("/auth", authApp)
  .route("/register", registerApp)
  .route("/user", userApp)
  .route("/event", eventApp)
  .route("/location", locationApp)
  .route("/challenge", challengeApp)
  .route("/ws", wsApp);

// Export types for frontend rpc - using the base app directly to ensure correct types setup
export type AppType = typeof routes;
export default app;
