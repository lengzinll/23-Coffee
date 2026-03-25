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

        let scans;
        if (payload.role === "admin") {
            scans = await db
                .select()
                .from(scanHistory)
                .leftJoin(user, eq(scanHistory.user_id, user.id))
                .where(eq(user.role, "user"))
                .orderBy(desc(scanHistory.timestamp));
        } else {
            scans = await db
                .select()
                .from(scanHistory)
                .leftJoin(user, eq(scanHistory.user_id, user.id))
                .where(eq(scanHistory.user_id, payload.id))
                .orderBy(desc(scanHistory.timestamp));
        }

        return c.json({ data: scans });
    })
    .post(
        "/",
        zValidator(
            "json",
            z.object({
                qrContent: z.string().optional(), // A secret value like "SHOP_CHECKIN_2026"
                userId: z.number().optional(),   // Optional for admin manual entry
            })
        ),
        async (c) => {
            const { qrContent, userId } = c.req.valid("json");
            const payload = c.get("jwtPayload") as { id: number; username: string; role: string };

            if (!payload?.id) {
                return c.json({ success: false, message: "Unauthorized: Missing user ID" }, 401);
            }

            let targetUserId = payload.id;
            let skipCooldown = false;

            // 1. Admin Manual Entry Logic
            if (userId !== undefined) {
                if (payload.role !== "admin") {
                    return c.json({ success: false, message: "Unauthorized: Only admins can specify a User ID" }, 403);
                }
                targetUserId = userId;
                skipCooldown = true;
            }
            // 2. Customer Self-Scan Logic
            else if (qrContent !== undefined) {
                const VALID_QR_CONTENT = "SHOP_CHECKIN_2026";
                if (qrContent !== VALID_QR_CONTENT) {
                    return c.json({ success: false, message: "Invalid QR Code Content" }, 400);
                }

                // Check cooldown for customers
                const now = Date.now();
                const lastScan = scanCooldowns.get(payload.id);
                if (lastScan && now - lastScan < COOLDOWN_MS) {
                    const remainingMins = Math.ceil((COOLDOWN_MS - (now - lastScan)) / 60000);
                    return c.json({
                        success: false,
                        message: `Please wait ${remainingMins} more minutes before scanning again.`
                    }, 429);
                }
            } else {
                return c.json({ success: false, message: "Either qrContent or userId must be provided" }, 400);
            }

            const [newScan] = await db
                .insert(scanHistory)
                .values({
                    user_id: targetUserId,
                    status: skipCooldown ? "approved" : "pending",
                })
                .returning();

            // Only update cooldown for self-scans
            if (!skipCooldown) {
                scanCooldowns.set(payload.id, Date.now());
            }

            return c.json({ success: true, data: newScan });
        }
    );

export default app;
