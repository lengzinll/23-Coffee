import { db } from "@/db";
import { user, scanHistory, systemSettings } from "@/db/schema";
import { count, eq, gte, lte, and, desc } from "drizzle-orm";
import { sendTelegramMessage, escapeTelegramHTML } from "@/lib/telegram";
import cron, { ScheduledTask } from 'node-cron';

/**
 * Dynamic Cron System
 * All scheduling is now controlled via the database.
 */

let morningJob: ScheduledTask | null = null;
let nightlyJob: ScheduledTask | null = null;

export function initCron() {
    console.log("⏱️ [Cron] Initializing dynamic scheduler...");
    rescheduleAllTasks();
}

export async function rescheduleAllTasks() {
    // Stop existing jobs
    if (morningJob) morningJob.stop();
    if (nightlyJob) nightlyJob.stop();

    // Fetch all settings at once
    const allSettings = await db.select().from(systemSettings);
    const settingsMap = new Map(allSettings.map(s => [s.key, s.value]));

    const morningTimeStr = settingsMap.get("NOTIFICATION_TIME") || process.env.NOTIFICATION_TIME || "07:00";
    const nightlyTimeStr = settingsMap.get("REPORT_TIME") || process.env.REPORT_TIME || "21:00";

    morningJob = scheduleMorningTask(morningTimeStr);
    nightlyJob = scheduleNightlyTask(nightlyTimeStr);
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
