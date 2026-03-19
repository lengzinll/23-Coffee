import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../../db";
import { user } from "../../db/schema";
import { eq } from "drizzle-orm";
import { sign } from "hono/jwt";
import { setCookie } from "hono/cookie";
import { env } from "../../env";
import argon2 from "argon2";

const authApp = new Hono({ strict: false })
  .post(
    "/login",
    zValidator(
      "json",
      z.object({
        username: z.string(),
        password: z.string(),
      }),
    ),
    async (c) => {
      const { username, password } = c.req.valid("json");

      const adminUser = await db
        .select()
        .from(user)
        .where(eq(user.username, username))
        .get();

      if (!adminUser || !(await argon2.verify(adminUser.password, password))) {
        return c.json({ success: false, message: "Invalid credentials" }, 401);
      }

      // Payload for JWT Auth
      const payload = {
        username: adminUser.username,
        role: adminUser.role,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
      };

      const secret = env.JWT_SECRET;
      const token = await sign(payload, secret);

      setCookie(c, "auth_token", token, {
        path: "/",
        httpOnly: true,
        maxAge: 60 * 60 * 24,
      });

      return c.json({ success: true, message: "Logged in successfully" });
    },
  )
  .post("/logout", async (c) => {
    setCookie(c, "auth_token", "", {
      path: "/",
      httpOnly: true,
      maxAge: 0,
    });
    return c.json({ success: true, message: "Logged out successfully" });
  });

export default authApp;
