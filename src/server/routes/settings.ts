import { Hono } from "hono";
import { db } from "../../db";
import { systemSettings } from "../../db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

const settingsApp = new Hono({ strict: false })
  // Get settings (open to all authorized users to read)
  .get("/", async (c) => {
    const allSettings = await db.select().from(systemSettings);
    
    // Convert array of {key, value} to an object
    const settingsObject: Record<string, string> = {};
    for (const setting of allSettings) {
      settingsObject[setting.key] = setting.value;
    }
    
    // Provide default if not set
    if (!settingsObject["STAMPS_PER_CYCLE"]) {
      settingsObject["STAMPS_PER_CYCLE"] = "6";
    }

    return c.json({ success: true, data: settingsObject });
  })
  // Update a setting (admin only)
  .post(
    "/",
    zValidator(
      "json",
      z.object({
        key: z.string(),
        value: z.string(),
      })
    ),
    async (c) => {
      const payload = c.get("jwtPayload") as { id: number; username: string; role: string } | undefined;

      if (payload?.role !== "admin") {
        return c.json({ success: false, message: "Forbidden: Admin access required" }, 403);
      }

      const { key, value } = c.req.valid("json");

      // Check if exists
      const existing = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).get();

      if (existing) {
        await db.update(systemSettings).set({ value }).where(eq(systemSettings.key, key));
      } else {
        await db.insert(systemSettings).values({ key, value });
      }

      return c.json({ success: true, message: "Setting updated successfully" });
    }
  );

export default settingsApp;
