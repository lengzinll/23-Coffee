import { Hono } from "hono";
import { db } from "../../db";
import { user } from "../../db/schema";
import { desc } from "drizzle-orm";

const userApp = new Hono({ strict: false })
  // Get all users
  .get("/", async (c) => {
    const payload = c.get("jwtPayload") as { id: number; username: string; role: string } | undefined;

    if (payload?.role !== "admin") {
      return c.json({ success: false, message: "Forbidden: Admin access required" }, 403);
    }

    // Select all users, excluding passwords for safety
    const allUsers = await db
      .select()
      .from(user)
      .orderBy(desc(user.timestamp));

    return c.json({ data: allUsers });
  });

export default userApp;
