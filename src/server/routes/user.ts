import { Hono } from "hono";
import { db } from "../../db";
import { user } from "../../db/schema";
import { desc } from "drizzle-orm";

const userApp = new Hono({ strict: false })
  // Get all users
  .get("/", async (c) => {
    // Select all users, excluding passwords for safety
    const allUsers = await db
      .select({
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(desc(user.createdAt));

    return c.json({ data: allUsers });
  });

export default userApp;
