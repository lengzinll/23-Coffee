import { Hono } from "hono";
import { db } from "@/db";
import { scanHistory, user, systemSettings } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { type Scan } from "@/lib/types";
import {
  sendTelegramMessage,
  escapeTelegramHTML,
  sendTelegramApprovalRequest,
  editTelegramApprovalMessage,
} from "@/lib/telegram";

// ── Build cycles logic (server-side version) ────────────────────────────────
type StampCycle = {
  cycleIndex: number;
  stamps: Scan[];
  cycleSize: number;
  isComplete: boolean;
  isRedeemed: boolean;
  isPendingRedemption: boolean;
  redeemedRecord: Scan | null;
};

function buildCycles(allStamps: Scan[], currentStampsPerCycle: number): StampCycle[] {
  // Approved stamps in chronological order (oldest first)
  const approved = allStamps
    .filter((s) => s.status === "approved")
    .sort((a, b) => {
      const ta = a.timestamp ? a.timestamp.getTime() : 0;
      const tb = b.timestamp ? b.timestamp.getTime() : 0;
      return ta - tb;
    });

  // Redeemed records in chronological order (oldest first)
  const redeemed = allStamps
    .filter((s) => s.status === "redeemed")
    .sort((a, b) => {
      const ta = a.timestamp ? a.timestamp.getTime() : 0;
      const tb = b.timestamp ? b.timestamp.getTime() : 0;
      return ta - tb;
    });

  // Pending stamps (for display in the current in-progress cycle)
  const pending = allStamps
    .filter((s) => s.status === "pending")
    .sort((a, b) => {
      const ta = a.timestamp ? a.timestamp.getTime() : 0;
      const tb = b.timestamp ? b.timestamp.getTime() : 0;
      return ta - tb;
    });

  const cycles: StampCycle[] = [];
  let approvedCursor = 0;

  // Past (redeemed) cycles — each uses its own recorded size
  redeemed.forEach((redeemedRecord, idx) => {
    const cycleSize = redeemedRecord.stamps_per_cycle ?? currentStampsPerCycle;
    const cycleStamps = approved.slice(approvedCursor, approvedCursor + cycleSize);
    approvedCursor += cycleSize;

    cycles.push({
      cycleIndex: idx,
      stamps: cycleStamps,
      cycleSize,
      isComplete: true,
      isRedeemed: true,
      isPendingRedemption: false,
      redeemedRecord,
    });
  });

  // Remaining approved stamps → may form complete (unclaimed) cycles
  const remaining = approved.slice(approvedCursor);
  let remainingCursor = 0;

  while (remainingCursor + currentStampsPerCycle <= remaining.length) {
    const cycleStamps = remaining.slice(remainingCursor, remainingCursor + currentStampsPerCycle);
    remainingCursor += currentStampsPerCycle;
    cycles.push({
      cycleIndex: cycles.length,
      stamps: cycleStamps,
      cycleSize: currentStampsPerCycle,
      isComplete: true,
      isRedeemed: false,
      isPendingRedemption: true,
      redeemedRecord: null,
    });
  }

  // Current in-progress cycle (partial approved + pending)
  const inProgressApproved = remaining.slice(remainingCursor);
  const inProgressStamps = [...inProgressApproved, ...pending];
  cycles.push({
    cycleIndex: cycles.length,
    stamps: inProgressStamps,
    cycleSize: currentStampsPerCycle,
    isComplete: false,
    isRedeemed: false,
    isPendingRedemption: false,
    redeemedRecord: null,
  });

  return cycles;
}

// Quick in-memory cache for scan cooldown — kept for potential future use
const scanCooldowns = new Map<number, number>();
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour (unused by QR claim, reserved for future)

// QR token TTL: removed — QR is now permanent (no token required)
// The /scan page is a fixed URL; auth is handled by the user's session cookie.

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

            const settingsRes = await db.select().from(systemSettings).where(eq(systemSettings.key, "STAMPS_PER_CYCLE")).get();
            const STAMPS_PER_CYCLE = settingsRes?.value ? parseInt(settingsRes.value, 10) : 6;

            // First get stamps BEFORE inserting to calculate cycles before
            const stampsBefore = await db
                .select()
                .from(scanHistory)
                .where(eq(scanHistory.user_id, userId));

            const cyclesBefore = buildCycles(stampsBefore, STAMPS_PER_CYCLE).filter((c) => c.isComplete).length;

            const [newStamp] = await db
                .insert(scanHistory)
                .values({
                    user_id: userId,
                    status: "approved",
                    stamps_per_cycle: STAMPS_PER_CYCLE,
                })
                .returning();

            // Check if this stamp completes a cycle → alert the admin
            const allUserStamps = await db
                .select()
                .from(scanHistory)
                .where(eq(scanHistory.user_id, userId));

            const approvedCount = allUserStamps.filter((s) => s.status === "approved").length;
            const cyclesAfter = buildCycles(allUserStamps, STAMPS_PER_CYCLE).filter((c) => c.isComplete).length;

            // Only alert when an EXACT cycle is completed (e.g. 5->6, 11->12)
            if (cyclesAfter > cyclesBefore) {
                // Fetch the username for the notification
                const targetUser = await db
                    .select({ username: user.username })
                    .from(user)
                    .where(eq(user.id, userId))
                    .get();

                if (targetUser) {
                    const { broadcast } = await import("../routes/ws");
                    broadcast({
                        type: "REWARD_EARNED",
                        username: targetUser.username,
                        totalStamps: approvedCount,
                    });

                    // Send push notification to admin via Telegram
                    await sendTelegramMessage(`🎉 <b>ជូនដំណឹង!</b>\nអតិថិជន <b>${escapeTelegramHTML(targetUser.username)}</b> បានប្រមូលត្រាគ្រប់ចំនួន ${STAMPS_PER_CYCLE}/${STAMPS_PER_CYCLE}!\n👉 <i>ការទិញបន្ទាប់របស់ពួកគេនឹងទទួលបានដោយឥតគិតថ្លៃ។</i>`);
                }
            }

            return c.json({ success: true, data: newStamp });
        }
    )
    .post(
        "/redeem",
        zValidator(
            "json",
            z.object({
                userId: z.number(),
            })
        ),
        async (c) => {
            const { userId } = c.req.valid("json");
            const payload = c.get("jwtPayload") as { id: number; username: string; role: string };

            if (!payload?.id) {
                return c.json({ success: false, message: "Unauthorized: Missing user ID" }, 401);
            }

            if (payload.role !== "admin") {
                return c.json({ success: false, message: "Unauthorized: Only admins can redeem rewards" }, 403);
            }

            // Count approved stamps to verify eligibility
            const userStamps = await db
                .select()
                .from(scanHistory)
                .where(eq(scanHistory.user_id, userId));

            const settingsRes = await db.select().from(systemSettings).where(eq(systemSettings.key, "STAMPS_PER_CYCLE")).get();
            const STAMPS_PER_CYCLE = settingsRes?.value ? parseInt(settingsRes.value, 10) : 6;

            // Build cycles to check for unredeemed reward
            const cycles = buildCycles(userStamps, STAMPS_PER_CYCLE);
            const hasUnredeemed = cycles.some((cycle) => cycle.isPendingRedemption);

            if (!hasUnredeemed) {
                return c.json({ success: false, message: "No unredeemed reward available for this user" }, 400);
            }

            const [redemption] = await db
                .insert(scanHistory)
                .values({
                    user_id: userId,
                    status: "redeemed",
                    stamps_per_cycle: STAMPS_PER_CYCLE,  // snapshot cycle size at time of redemption
                })
                .returning();

            return c.json({ success: true, data: redemption });
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

            const stamp = await db
                .select()
                .from(scanHistory)
                .where(eq(scanHistory.id, parseInt(id, 10)))
                .get();

            if (!stamp) {
                return c.json({ success: false, message: "Stamp not found" }, 404);
            }

            // If stamp is approved, check if it's part of a REDEEMED cycle!
            if (stamp.status === "approved" && stamp.user_id) {
                const userStamps = await db
                    .select()
                    .from(scanHistory)
                    .where(eq(scanHistory.user_id, stamp.user_id));

                const settingsRes = await db.select().from(systemSettings).where(eq(systemSettings.key, "STAMPS_PER_CYCLE")).get();
                const STAMPS_PER_CYCLE = settingsRes?.value ? parseInt(settingsRes.value, 10) : 6;

                const cycles = buildCycles(userStamps, STAMPS_PER_CYCLE);

                // Check if stamp is part of any REDEEMED cycle
                const isPartOfRedeemedCycle = cycles.some(
                    (cycle) =>
                        cycle.isRedeemed &&
                        cycle.stamps.some((cycleStamp) => cycleStamp.id === stamp.id)
                );

                if (isPartOfRedeemedCycle) {
                    return c.json({ success: false, message: "Cannot delete stamp that's part of a redeemed" }, 400);
                }
            }

            // Okay, delete it!
            await db.delete(scanHistory).where(eq(scanHistory.id, parseInt(id, 10)));

            return c.json({ success: true, message: "Stamp deleted successfully" });
        }
    )
    .post(
        "/notifyAll",
        zValidator(
            "json",
            z.object({
                usernames: z.array(z.string()),
            })
        ),
        async (c) => {
            const { usernames } = c.req.valid("json");
            const payload = c.get("jwtPayload") as { id: number; username: string; role: string } | undefined;

            if (!payload?.id) {
                return c.json({ success: false, message: "Unauthorized: Missing user ID" }, 401);
            }

            if (payload.role !== "admin") {
                return c.json({ success: false, message: "Unauthorized: Only admins can send notifications" }, 403);
            }

            if (!usernames || usernames.length === 0) {
                return c.json({ success: false, message: "No users to notify" }, 400);
            }

            const userList = usernames.map((name, i) => `${i + 1}. <b>${escapeTelegramHTML(name)}</b>`).join('\n');
            const telegramMessage = `🎉 <b>ជូនដំណឹង! មានអតិថិជន ${usernames.length}នាក់ ដែលរួចរាល់សម្រាប់ការទទួលរង្វាន់៖</b>\n\n${userList}\n\n👉 <i>ការទិញបន្ទាប់របស់ពួកគេនឹងទទួលបានដោយឥតគិតថ្លៃ។</i>`;

            const pushResult = await sendTelegramMessage(telegramMessage);

            if (!pushResult?.success) {
                return c.json({ success: false, message: `Telegram Error: ${pushResult?.error || "Unknown"}` }, 500);
            }

            return c.json({ success: true, message: "Notification sent successfully." });
        }
    )

    // ── QR Stamp Claim ─────────────────────────────────────────────────────────
    //
    // Customer scans QR → stamp inserted as "pending"
    // Admin approves via dashboard OR Telegram inline button
    // Telegram polling cron picks up callback_query and calls the approve logic

    .post("/qr/claim", async (c) => {
        const payload = c.get("jwtPayload") as { id: number; username: string; role: string } | undefined;

        if (!payload?.id) {
            return c.json({ success: false, message: "Unauthorized: Please log in first" }, 401);
        }

        if (payload.role === "admin") {
            return c.json({ success: false, message: "Admins cannot claim stamps" }, 403);
        }

        const userId = payload.id;

        const settingsRes = await db.select().from(systemSettings).where(eq(systemSettings.key, "STAMPS_PER_CYCLE")).get();
        const STAMPS_PER_CYCLE = settingsRes?.value ? parseInt(settingsRes.value, 10) : 6;

        // Insert as PENDING — waits for admin approval
        const [newStamp] = await db
            .insert(scanHistory)
            .values({ user_id: userId, status: "pending", stamps_per_cycle: STAMPS_PER_CYCLE })
            .returning();

        // Get username for the Telegram message
        const targetUser = await db
            .select({ username: user.username })
            .from(user)
            .where(eq(user.id, userId))
            .get();

        if (targetUser) {
            // Send Telegram approval request with inline buttons
            const tgResult = await sendTelegramApprovalRequest(
                newStamp.id,
                targetUser.username,
                newStamp.timestamp ?? new Date(),
            );

            // Save the Telegram message_id so we can edit it after approval/rejection
            if (tgResult.success && tgResult.messageId) {
                await db
                    .update(scanHistory)
                    .set({ telegram_message_id: tgResult.messageId })
                    .where(eq(scanHistory.id, newStamp.id));
            }
        }

        return c.json({ success: true, data: newStamp, pending: true });
    })

    // ── Approve / Reject a pending stamp ────────────────────────────────────────
    // Used by: admin dashboard buttons AND Telegram polling cron
    .post(
        "/approve",
        zValidator("json", z.object({
            stampId: z.number(),
            action: z.enum(["approved", "rejected"]),
        })),
        async (c) => {
            const { stampId, action } = c.req.valid("json");
            const payload = c.get("jwtPayload") as { id: number; username: string; role: string } | undefined;

            if (!payload?.id) {
                return c.json({ success: false, message: "Unauthorized" }, 401);
            }

            if (payload.role !== "admin") {
                return c.json({ success: false, message: "Only admins can approve/reject stamps" }, 403);
            }

            const stamp = await db
                .select()
                .from(scanHistory)
                .where(eq(scanHistory.id, stampId))
                .get();

            if (!stamp) {
                return c.json({ success: false, message: "Stamp not found" }, 404);
            }

            if (stamp.status !== "pending") {
                return c.json({ success: false, message: "Stamp is not pending" }, 400);
            }

            const settingsRes = await db.select().from(systemSettings).where(eq(systemSettings.key, "STAMPS_PER_CYCLE")).get();
            const STAMPS_PER_CYCLE = settingsRes?.value ? parseInt(settingsRes.value, 10) : 6;

            // First get stamps BEFORE updating if we need to check cycles
            let cyclesBefore: number = 0;
            if (action === "approved" && stamp.user_id) {
                const stampsBefore = await db
                    .select()
                    .from(scanHistory)
                    .where(eq(scanHistory.user_id, stamp.user_id));
                cyclesBefore = buildCycles(stampsBefore, STAMPS_PER_CYCLE).filter((c) => c.isComplete).length;
            }

            await db
                .update(scanHistory)
                .set({ status: action, stamps_per_cycle: STAMPS_PER_CYCLE })
                .where(eq(scanHistory.id, stampId));

            // Edit the Telegram message to reflect the decision
            if (stamp.telegram_message_id && stamp.user_id) {
                const targetUser = await db
                    .select({ username: user.username })
                    .from(user)
                    .where(eq(user.id, stamp.user_id))
                    .get();

                if (targetUser) {
                    await editTelegramApprovalMessage(
                        stamp.telegram_message_id,
                        targetUser.username,
                        action === "approved",
                        "web",
                    );
                }
            }

            // If approved, check if it completes a cycle
            if (action === "approved" && stamp.user_id) {
                const allUserStamps = await db
                    .select()
                    .from(scanHistory)
                    .where(eq(scanHistory.user_id, stamp.user_id));

                const approvedCount = allUserStamps.filter((s) => s.status === "approved").length;
                const cyclesAfter = buildCycles(allUserStamps, STAMPS_PER_CYCLE).filter((c) => c.isComplete).length;

                if (cyclesAfter > cyclesBefore) {
                    const targetUser = await db
                        .select({ username: user.username })
                        .from(user)
                        .where(eq(user.id, stamp.user_id))
                        .get();

                    if (targetUser) {
                        const { broadcast } = await import("../routes/ws");
                        broadcast({ type: "REWARD_EARNED", username: targetUser.username, totalStamps: approvedCount });
                        await sendTelegramMessage(
                            `🎉 <b>ជូនដំណឹង!</b>\nអតិថិជន <b>${escapeTelegramHTML(targetUser.username)}</b> បានប្រមូលត្រាគ្រប់ចំនួន ${STAMPS_PER_CYCLE}/${STAMPS_PER_CYCLE}!\n👉 <i>ការទិញបន្ទាប់របស់ពួកគេនឹងទទួលបានដោយឥតគិតថ្លៃ។</i>`,
                        );
                    }
                }

                // Broadcast update to dashboard
                const { broadcast } = await import("../routes/ws");
                broadcast({ type: "SCAN_UPDATED", scan: { ...stamp, status: "approved" } as any });
            }

            return c.json({ success: true, action });
        }
    );

export default app;
