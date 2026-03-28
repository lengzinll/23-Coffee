import { Hono } from "hono";
import { db } from "../../db";
import { user } from "../../db/schema";
import { desc, eq } from "drizzle-orm";
import argon2 from "argon2";

const userApp = new Hono({ strict: false })
  // Get all users
  .get("/", async (c) => {
    const payload = c.get("jwtPayload") as { id: number; username: string; role: string } | undefined;

    if (payload?.role !== "admin") {
      return c.json({ success: false, message: "Forbidden: Admin access required" }, 403);
    }

    // Select all users, excluding passwords for safety
    const allUsers = await db
      .select({
        id: user.id,
        username: user.username,
        role: user.role,
        timestamp: user.timestamp,
      })
      .from(user)
      .orderBy(desc(user.timestamp));

    return c.json({ data: allUsers });
  })
  // Reset password to default
  .post("/:id/reset-password", async (c) => {
    const payload = c.get("jwtPayload") as { id: number; username: string; role: string } | undefined;

    if (payload?.role !== "admin") {
      return c.json({ success: false, message: "Forbidden: Admin access required" }, 403);
    }

    const { id } = c.req.param();
    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
      return c.json({ success: false, message: "Invalid user ID" }, 400);
    }

    const targetUser = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, userId))
      .get();

    if (!targetUser) {
      return c.json({ success: false, message: "User not found" }, 404);
    }

    if (targetUser.role === "admin") {
      return c.json({ success: false, message: "Cannot reset an admin's password" }, 403);
    }

    const defaultPassword = "23coffee";
    const hashed = await argon2.hash(defaultPassword);

    await db
      .update(user)
      .set({ password: hashed })
      .where(eq(user.id, userId));

    return c.json({ success: true, message: "Password reset successfully to 23coffee" });
  })
  // Delete user
  .delete("/:id", async (c) => {
    const payload = c.get("jwtPayload") as { id: number; username: string; role: string } | undefined;

    if (payload?.role !== "admin") {
      return c.json({ success: false, message: "Forbidden: Admin access required" }, 403);
    }

    const { id } = c.req.param();
    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
      return c.json({ success: false, message: "Invalid user ID" }, 400);
    }

    if (userId === payload.id) {
      return c.json({ success: false, message: "Cannot delete your own account" }, 403);
    }

    const targetUser = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, userId))
      .get();

    if (!targetUser) {
      return c.json({ success: false, message: "User not found" }, 404);
    }

    if (targetUser.role === "admin") {
      return c.json({ success: false, message: "Cannot delete an admin account" }, 403);
    }

    await db.delete(user).where(eq(user.id, userId));

    return c.json({ success: true, message: "User deleted successfully" });
  });

export default userApp;
