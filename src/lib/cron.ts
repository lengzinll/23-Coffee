import { db } from "@/db";
import { user, scanHistory, systemSettings } from "@/db/schema";
import { count, eq, gte, lte, and, desc } from "drizzle-orm";
import {
    sendTelegramMessage,
    escapeTelegramHTML,
    getTelegramUpdates,
    answerCallbackQuery,
    editTelegramApprovalMessage,
    drainAllTelegramUpdates,
} from "@/lib/telegram";
import cron, { ScheduledTask } from 'node-cron';

/**
 * Dynamic Cron System
 * All scheduling is now controlled via the database.
 */

let morningJob: ScheduledTask | null = null;
let nightlyJob: ScheduledTask | null = null;
let telegramPollingJob: ScheduledTask | null = null;

// Track the last Telegram update_id we've processed to avoid double-processing
let lastTelegramUpdateId = 0;
let telegramPollingInitialized = false;

export function initCron() {
    console.log("⏱️ [Cron] Initializing dynamic scheduler...");
    rescheduleAllTasks();
}

export async function rescheduleAllTasks() {
    // Stop existing jobs
    if (morningJob) morningJob.stop();
    if (nightlyJob) nightlyJob.stop();
    if (telegramPollingJob) telegramPollingJob.stop();

    // Fetch all settings at once
    const allSettings = await db.select().from(systemSettings);
    const settingsMap = new Map(allSettings.map(s => [s.key, s.value]));

    const morningTimeStr = settingsMap.get("NOTIFICATION_TIME") || process.env.NOTIFICATION_TIME || "07:00";
    const nightlyTimeStr = settingsMap.get("REPORT_TIME") || process.env.REPORT_TIME || "21:00";

    morningJob = scheduleMorningTask(morningTimeStr);
    nightlyJob = scheduleNightlyTask(nightlyTimeStr);

    // Telegram polling: every 5 seconds to process approve/reject callbacks
    telegramPollingJob = cron.schedule("*/5 * * * * *", async () => {
        await runTelegramPolling();
    });
    console.log("⏱️ [Cron] Telegram approval polling started (every 5s).");
}

// 1. Morning Notification (7:00 AM)
async function runMorningTask() {
    console.log("🕒 [Cron] Running morning notification task!");
    try {
        const settingsRes = await db.select().from(systemSettings).where(eq(systemSettings.key, "STAMPS_PER_CYCLE")).get();
        const cycleLength = settingsRes?.value ? parseInt(settingsRes.value, 10) : 6;

        const allCustomerStamps = await db
            .select({
                id: user.id,
                username: user.username,
                stamps: count(scanHistory.id),
            })
            .from(scanHistory)
            .innerJoin(user, eq(scanHistory.user_id, user.id))
            .where(eq(scanHistory.status, "approved"))
            .groupBy(user.id, user.username);
            
        const nearlyCompleteCustomers = allCustomerStamps
            .filter(c => c.stamps > 0 && c.stamps % cycleLength === 0)
            .map(c => c.username);

        if (nearlyCompleteCustomers.length > 0) {
            const userList = nearlyCompleteCustomers.map((name, i) => `${i + 1}. <b>${escapeTelegramHTML(name)}</b>`).join('\n');
            const telegramMessage = `🎉 <b>ជូនដំណឹងអូតូ (Auto)! មានអតិថិជន ${nearlyCompleteCustomers.length}នាក់ ដែលរួចរាល់សម្រាប់ការទទួលរង្វាន់ថ្ងៃនេះ៖</b>\n\n${userList}\n\n👉 <i>ការទិញបន្ទាប់របស់ពួកគេនឹងទទួលបានដោយឥតគិតថ្លៃ។</i>`;
            
            await sendTelegramMessage(telegramMessage);
            console.log("✅ [Cron] Morning notification sent successfully.");
        }
    } catch (e) {
        console.error("❌ [Cron Error - Morning]", e);
    }
}

function scheduleMorningTask(timeStr: string) {
    const cronExpr = timeToCron(timeStr);
    const [targetHour, targetMinute] = timeStr.split(":").map(Number);
    const msUntilTarget = calculateMsUntil(targetHour, targetMinute);
    
    console.log(`⏱️ [Cron] Morning notification scheduled at ${timeStr} (${cronExpr}). Next run in ${Math.round(msUntilTarget / 60000)} minutes.`);
    
    return cron.schedule(cronExpr, async () => {
        await runMorningTask();
    });
}


// 2. Nightly Report (21:00 / 9:00 PM)
async function runNightlyTask() {
    console.log("🕒 [Cron] Running nightly report task!");
    try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        const stampsToday = await db
            .select({ count: count(scanHistory.id) })
            .from(scanHistory)
            .where(
                and(
                    eq(scanHistory.status, "approved"),
                    gte(scanHistory.timestamp, startOfDay),
                    lte(scanHistory.timestamp, endOfDay)
                )
            ).get();

        const redeemedToday = await db
            .select({ count: count(scanHistory.id) })
            .from(scanHistory)
            .where(
                and(
                    eq(scanHistory.status, "redeemed"),
                    gte(scanHistory.timestamp, startOfDay),
                    lte(scanHistory.timestamp, endOfDay)
                )
            ).get();

        const customerRanks = await db
            .select({
                username: user.username,
                stamps: count(scanHistory.id),
            })
            .from(scanHistory)
            .innerJoin(user, eq(scanHistory.user_id, user.id))
            .where(
                and(
                    eq(scanHistory.status, "approved"),
                    gte(scanHistory.timestamp, startOfDay),
                    lte(scanHistory.timestamp, endOfDay)
                )
            )
            .groupBy(user.id, user.username)
            .orderBy(desc(count(scanHistory.id)))
            .limit(1);

        const bestCustomerStr = customerRanks.length > 0 
            ? `<b>${escapeTelegramHTML(customerRanks[0].username)}</b> (${customerRanks[0].stamps} ត្រា)` 
            : "<i>គ្មានអតិថិជន</i>";

        const issuedCount = stampsToday?.count || 0;
        const redeemedCount = redeemedToday?.count || 0;

        const telegramMessage = `📊 <b>របាយការណ៍សង្ខេបប្រចាំថ្ងៃ!</b> 🌙
\n✅ <b>ត្រាដែលបានផ្តល់ជូនថ្ងៃនេះ៖</b> ${issuedCount} ត្រា\n🎁 <b>កាហ្វេឥតគិតថ្លៃដែលអតិថិជនបានដកប្រាក់៖</b> ${redeemedCount} កែវ\n🏆 <b>អតិថិជនសកម្មជាងគេថ្ងៃនេះ៖</b> ${bestCustomerStr}\n\n<i>អរគុណសម្រាប់ការងារនៅថ្ងៃនេះ!</i>`;
        
        await sendTelegramMessage(telegramMessage);
        console.log("✅ [Cron] Nightly report sent successfully.");

    } catch (e) {
        console.error("❌ [Cron Error - Nightly]", e);
    }
}

function scheduleNightlyTask(timeStr: string) {
    const cronExpr = timeToCron(timeStr);
    const [targetHour, targetMinute] = timeStr.split(":").map(Number);
    const msUntilTarget = calculateMsUntil(targetHour, targetMinute);
    
    console.log(`⏱️ [Cron] Nightly report scheduled at ${timeStr} (${cronExpr}). Next run in ${Math.round(msUntilTarget / 60000)} minutes.`);
    
    return cron.schedule(cronExpr, async () => {
        await runNightlyTask();
    });
}

// ── Telegram Approval Polling ─────────────────────────────────────────────

/** On server start: drain all pending updates and set the offset past them. */
async function drainOldTelegramUpdates() {
    const maxId = await drainAllTelegramUpdates();
    if (maxId > 0) {
        lastTelegramUpdateId = maxId;
        console.log(`⏭ [Telegram Poll] Drained old updates. Starting from #${maxId + 1}`);
    }
}

async function runTelegramPolling() {
    try {
        // On first run: drain all pending Telegram updates so we don't
        // reprocess stale button presses from before this server started.
        if (!telegramPollingInitialized) {
            telegramPollingInitialized = true;
            await drainOldTelegramUpdates();
            return;
        }

        const updates = await getTelegramUpdates(lastTelegramUpdateId + 1);
        if (updates.length === 0) return;

        const nowSec = Math.floor(Date.now() / 1000);

        for (const update of updates) {
            if (update.updateId > lastTelegramUpdateId) {
                lastTelegramUpdateId = update.updateId;
            }

            // Skip callbacks older than 10 minutes — stale button presses
            if (update.date && nowSec - update.date > 600) {
                console.log(`⏭ [Telegram Poll] Skipping stale callback (age: ${nowSec - update.date}s)`);
                continue;
            }

            const { callbackQueryId, data } = update;
            const approveMatch = data.match(/^approve_(\d+)$/);
            const rejectMatch = data.match(/^reject_(\d+)$/);
            if (!approveMatch && !rejectMatch) continue;

            const stampId = parseInt((approveMatch ?? rejectMatch)![1], 10);
            const action = approveMatch ? "approved" : "rejected";

            const stamp = await db
                .select()
                .from(scanHistory)
                .where(eq(scanHistory.id, stampId))
                .get();

            if (!stamp) {
                await answerCallbackQuery(callbackQueryId, "រកមិនឃើញត្រានេះទេ!");
                continue;
            }

            if (stamp.status !== "pending") {
                await answerCallbackQuery(callbackQueryId, "ត្រានេះបានដំណើរការរួចហើយ!");
                continue;
            }

            await db
                .update(scanHistory)
                .set({ status: action })
                .where(eq(scanHistory.id, stampId));

            const targetUser = stamp.user_id
                ? await db.select({ username: user.username }).from(user).where(eq(user.id, stamp.user_id)).get()
                : null;

            if (stamp.telegram_message_id && targetUser) {
                await editTelegramApprovalMessage(
                    stamp.telegram_message_id,
                    targetUser.username,
                    action === "approved",
                    "telegram",
                );
            }

            await answerCallbackQuery(
                callbackQueryId,
                action === "approved" ? "✅ បានអនុម័ត!" : "❌ បានបដិសេធ!",
            );

            if (action === "approved" && stamp.user_id) {
                const allUserStamps = await db
                    .select()
                    .from(scanHistory)
                    .where(eq(scanHistory.user_id, stamp.user_id));

                const approvedCount = allUserStamps.filter(s => s.status === "approved").length;
                const settingsRes = await db.select().from(systemSettings).where(eq(systemSettings.key, "STAMPS_PER_CYCLE")).get();
                const STAMPS_PER_CYCLE = settingsRes?.value ? parseInt(settingsRes.value, 10) : 6;

                const cyclesBefore = Math.floor((approvedCount - 1) / STAMPS_PER_CYCLE);
                const cyclesAfter = Math.floor(approvedCount / STAMPS_PER_CYCLE);

                try {
                    const { broadcast } = await import("../server/routes/ws");
                    broadcast({ type: "SCAN_UPDATED", scan: { ...stamp, status: "approved" } as any });

                    if (cyclesAfter > cyclesBefore && targetUser) {
                        broadcast({ type: "REWARD_EARNED", username: targetUser.username, totalStamps: approvedCount });
                        await sendTelegramMessage(
                            `🎉 <b>ជូនដំណឹង!</b>\nអតិថិជន <b>${escapeTelegramHTML(targetUser.username)}</b> បានប្រមូលត្រាគ្រប់ចំនួន ${STAMPS_PER_CYCLE}/${STAMPS_PER_CYCLE}!\n👉 <i>ការទិញបន្ទាប់របស់ពួកគេនឹងទទួលបានដោយឥតគិតថ្លៃ។</i>`,
                        );
                    }
                } catch { }
            }

            console.log(`✅ [Telegram Poll] Stamp #${stampId} → ${action}`);
        }
    } catch (e) {
        console.error("❌ [Telegram Polling Error]", e);
    }
}

// Helper to convert HH:MM to cron expression (MM HH * * *)
function timeToCron(timeStr: string) {
    const [hour, minute] = timeStr.split(":").map(Number);
    return `${minute} ${hour} * * *`;
}

// Helper to calculate time until next occurrence of target HH:MM
function calculateMsUntil(targetHour: number, targetMinute: number) {
    const now = new Date();
    const target = new Date();
    target.setHours(targetHour, targetMinute, 0, 0);

    // If target time has already passed today, set for tomorrow
    if (now.getTime() >= target.getTime()) {
        target.setDate(target.getDate() + 1);
    }

    return target.getTime() - now.getTime();
}
