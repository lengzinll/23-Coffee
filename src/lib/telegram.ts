import { db } from "../db";
import { systemSettings } from "../db/schema";

export function escapeTelegramHTML(text: string): string {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

export async function sendTelegramMessage(message: string): Promise<{ success: boolean; error?: string }> {
    // 1. Fetch settings from DB
    const allSettings = await db.select().from(systemSettings);
    const settingsMap = new Map(allSettings.map(s => [s.key, s.value]));

    // 2. Prioritize DB values, fallback to .env
    const token = settingsMap.get("TELEGRAM_BOT_TOKEN") || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = settingsMap.get("TELEGRAM_CHAT_ID") || process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
        console.log("❌ [Telegram] Notification skipped: Credentials missing in both DB and .env");
        return { success: false, error: "Telegram credentials missing" };
    }

    try {
        console.log(`⏳ [Telegram] Sending message to ${chatId}...`);
        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: "HTML",
            }),
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error("❌ [Telegram Error]", errorText);
            return { success: false, error: errorText };
        } else {
            console.log("✅ [Telegram] Message sent successfully!");
            return { success: true };
        }
    } catch (error: any) {
        console.error("❌ [Telegram Exception]", error);
        return { success: false, error: error.message || "Network Error" };
    }
}
