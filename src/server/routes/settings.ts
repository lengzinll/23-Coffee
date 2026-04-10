import { Hono } from "hono";
import { db } from "../../db";
import { systemSettings } from "../../db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { sendTelegramMessage } from "@/lib/telegram";

import { rescheduleAllTasks } from "@/lib/cron";

const settingsApp = new Hono({ strict: false })
  // Get settings (open to all authorized users to read)
  .get("/", async (c) => {
    const allSettings = await db.select().from(systemSettings);
    
    // Convert array of {key, value} to an object
    const settingsObject: Record<string, string> = {};
    for (const setting of allSettings) {
      settingsObject[setting.key] = setting.value;
    }
    
    // Provide defaults from .env if DB is empty
    const defaults: Record<string, string> = {
      STAMPS_PER_CYCLE: process.env.STAMPS_PER_CYCLE || "6",
      NOTIFICATION_TIME: process.env.NOTIFICATION_TIME || "07:00",
      REPORT_TIME: process.env.REPORT_TIME || "21:00",
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
      TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || "",
    };

    for (const key in defaults) {
      if (!settingsObject[key]) {
        settingsObject[key] = defaults[key];
      }
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

      // Trigger re-scheduling
      await rescheduleAllTasks();

      return c.json({ success: true, message: "Setting updated successfully" });
    }
  )
  .post(
    "/test",
    async (c) => {
      const payload = c.get("jwtPayload") as { id: number; username: string; role: string } | undefined;

      if (payload?.role !== "admin") {
        return c.json({ success: false, message: "Forbidden" }, 403);
      }

      const res = await sendTelegramMessage("🔔 <b>តេស្តតំណភ្ជាប់!</b>\nការសាកល្បងពី Admin Dashboard របស់អ្នកបានជោគជ័យ។");
      
      if (!res.success) {
        return c.json({ success: false, message: res.error || "Failed to send" }, 500);
      }

      return c.json({ success: true, message: "Test message sent!" });
    }
  );

export default settingsApp;
