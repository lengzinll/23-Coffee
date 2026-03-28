import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../../db";
import { user } from "../../db/schema";
import { eq, like } from "drizzle-orm";
import { sign } from "hono/jwt";
import { setCookie } from "hono/cookie";
import { env } from "../../env";
import argon2 from "argon2";

const authApp = new Hono({ strict: false })
  .post(
    "/register",
    zValidator(
      "json",
      z.object({
        username: z.string().min(3).max(32),
        password: z.string().min(6),
      }),
    ),
    async (c) => {
      const { username, password } = c.req.valid("json");

      // Check if username already exists
      const existing = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.username, username))
        .get();

      if (existing) {
        // Find alternative username
        const similarUsers = await db
          .select({ username: user.username })
          .from(user)
          .where(like(user.username, `${username}%`));
        
        const takenSet = new Set(similarUsers.map((u) => u.username));
        let altUsername = "";
        
        for (let i = 1; i <= 999; i++) {
          const checkName = `${username}${i}`;
          if (!takenSet.has(checkName)) {
            altUsername = checkName;
            break;
          }
        }

        const message = altUsername 
          ? `Username already taken. Please try '${altUsername}'` 
          : "Username already taken";

        return c.json({ success: false, message }, 409);
      }

      const hashed = await argon2.hash(password);

      await db.insert(user).values({
        username,
        password: hashed,
        role: "user",
      });

      return c.json({ success: true, message: "Success" }, 201);
    },
  )
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

      const _user = await db
        .select()
        .from(user)
        .where(eq(user.username, username))
        .get();

      if (!_user || !(await argon2.verify(_user.password, password))) {
        return c.json({ success: false, message: "Invalid credentials" }, 401);
      }

      // Payload for JWT Auth
      const payload = {
        id: _user.id,
        username: _user.username,
        role: _user.role,
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
  .get("/me", async (c) => {
    const payload = c.get("jwtPayload") as { id: number; username: string; role: string } | undefined;
    if (!payload) {
      return c.json({ success: false, message: "Not logged in" }, 401);
    }
    return c.json({ success: true, user: payload });
  })
  .post(
    "/change-password",
    zValidator(
      "json",
      z.object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z.string().min(6),
      }),
    ),
    async (c) => {
      const payload = c.get("jwtPayload") as { id: number; username: string; role: string } | undefined;
      if (!payload) {
        return c.json({ success: false, message: "Not logged in" }, 401);
      }

      const { currentPassword, newPassword } = c.req.valid("json");

      const _user = await db
        .select()
        .from(user)
        .where(eq(user.id, payload.id))
        .get();

      if (!_user) {
        return c.json({ success: false, message: "User not found" }, 404);
      }

      const isValidPassword = await argon2.verify(_user.password, currentPassword);
      if (!isValidPassword) {
        return c.json({ success: false, message: "Incorrect current password" }, 401);
      }

      const hashedNew = await argon2.hash(newPassword);

      await db
        .update(user)
        .set({ password: hashedNew })
        .where(eq(user.id, payload.id));

      return c.json({ success: true, message: "Password updated successfully" });
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
