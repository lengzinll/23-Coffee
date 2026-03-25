import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";
import { env } from "../../env";

type PublicPath = {
  path: string;
  method?: string;
  exact?: boolean;
};

const publicPaths: PublicPath[] = [
  { path: "/api/auth/login", method: "POST", exact: true },
  { path: "/api/auth/register", method: "POST", exact: true },
  { path: "/api/register", method: "POST", exact: true },
  { path: "/api/register/", method: "GET", exact: false },
  { path: "/api/register/count", method: "GET", exact: true },
  { path: "/api/event/active", method: "GET", exact: true },
  { path: "/api/event/active/tasks", method: "GET", exact: true },
];

export const authMiddleware = createMiddleware(async (c, next) => {
  const path = c.req.path;
  const method = c.req.method;

  // Check if path is public with granular matching
  const normalizedPath =
    path.endsWith("/") && path.length > 1 ? path.slice(0, -1) : path;
  const isPublic = publicPaths.some((p) => {
    const pathMatches = p.exact
      ? normalizedPath === p.path
      : normalizedPath.startsWith(p.path);
    const methodMatches = !p.method || method === p.method;
    return pathMatches && methodMatches;
  });

  if (isPublic) {
    return await next();
  }

  const token = getCookie(c, "auth_token");

  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const payload = await verify(token, env.JWT_SECRET, "HS256");
    // Store payload in context for downstream handlers if needed
    c.set("jwtPayload", payload);
    await next();
  } catch (e) {
    return c.json({ error: "Invalid token" }, 401);
  }
});
