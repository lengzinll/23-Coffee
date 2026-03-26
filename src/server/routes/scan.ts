import { Hono } from "hono";
import { db } from "@/db";
import { scanHistory, user } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

// Quick in-memory cache for scan cooldown (1 per hour per user)
const scanCooldowns = new Map<number, number>();
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

const app = new Hono()
    .get("/", async (c) => {
        const payload = c.get("jwtPayload") as { id: number; username: string; role: string } | undefined;

        if (!payload?.id) {
            return c.json({ data: [] }, 401);
        }

        let stamps;
        if (payload.role === "admin") {
            stamps = await db
                .select()
                .from(scanHistory)
                .leftJoin(user, eq(scanHistory.user_id, user.id))
                .where(eq(user.role, "user"))
                .orderBy(desc(scanHistory.timestamp));
        } else {
            stamps = await db
                .select()
                .from(scanHistory)
                .leftJoin(user, eq(scanHistory.user_id, user.id))
                .where(eq(scanHistory.user_id, payload.id))
                .orderBy(desc(scanHistory.timestamp));
        }

        return c.json({ data: stamps });
    })
    .post(
        "/",
        zValidator(
            "json",
            z.object({
                userId: z.number(),   // For admin manual entry
            })
        ),
        async (c) => {
            const { userId } = c.req.valid("json");
            const payload = c.get("jwtPayload") as { id: number; username: string; role: string };

            if (!payload?.id) {
                return c.json({ success: false, message: "Unauthorized: Missing user ID" }, 401);
            }

            if (payload.role !== "admin") {
                return c.json({ success: false, message: "Unauthorized: Only admins can manually add stamps" }, 403);
            }

            const [newStamp] = await db
                .insert(scanHistory)
                .values({
                    user_id: userId,
                    status: "approved",
                })
                .returning();

            return c.json({ success: true, data: newStamp });
        }
    )
    .delete(
        "/:id",
        zValidator(
            "param",
            z.object({
                id: z.string(),
            })
        ),
        async (c) => {
            const { id } = c.req.valid("param");
            const payload = c.get("jwtPayload") as { id: number; username: string; role: string } | undefined;

            if (!payload?.id) {
                return c.json({ success: false, message: "Unauthorized: Missing user ID" }, 401);
            }

            if (payload.role !== "admin") {
                return c.json({ success: false, message: "Unauthorized: Only admins can delete stamps" }, 403);
            }

            await db.delete(scanHistory).where(eq(scanHistory.id, parseInt(id, 10)));

            return c.json({ success: true, message: "Stamp deleted successfully" });
        }
    );

export default app;
