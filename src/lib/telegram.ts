import { db } from "../db";
import { systemSettings } from "../db/schema";

export function escapeTelegramHTML(text: string): string {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

async function getTelegramCredentials() {
    const allSettings = await db.select().from(systemSettings);
    const settingsMap = new Map(allSettings.map(s => [s.key, s.value]));
    const token = settingsMap.get("TELEGRAM_BOT_TOKEN") || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = settingsMap.get("TELEGRAM_CHAT_ID") || process.env.TELEGRAM_CHAT_ID;
    return { token, chatId };
}

export async function sendTelegramMessage(message: string): Promise<{ success: boolean; error?: string }> {
    const { token, chatId } = await getTelegramCredentials();

    if (!token || !chatId) {
        console.log("❌ [Telegram] Notification skipped: Credentials missing in both DB and .env");
        return { success: false, error: "Telegram credentials missing" };
    }

    try {
        console.log(`⏳ [Telegram] Sending message to ${chatId}...`);
        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
        }
        console.log("✅ [Telegram] Message sent successfully!");
        return { success: true };
    } catch (error: any) {
        console.error("❌ [Telegram Exception]", error);
        return { success: false, error: error.message || "Network Error" };
    }
}

/** Send a message with Approve / Reject inline buttons.
 *  Returns the Telegram message_id so we can edit it later. */
export async function sendTelegramApprovalRequest(
    stampId: number,
    username: string,
    timestamp: Date,
): Promise<{ success: boolean; messageId?: number; error?: string }> {
    const { token, chatId } = await getTelegramCredentials();

    if (!token || !chatId) {
        return { success: false, error: "Telegram credentials missing" };
    }

    const timeStr = timestamp.toLocaleString("km-KH", {
        timeZone: "Asia/Phnom_Penh",
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });

    const text =
        `☕ <b>សំណើត្រាថ្មី!</b>\n\n` +
        `👤 អតិថិជន៖ <b>${escapeTelegramHTML(username)}</b>\n` +
        `🕐 ពេលវេលា៖ ${timeStr}\n` +
        `🆔 ត្រាលេខ៖ <code>${stampId}</code>\n\n` +
        `<i>តើអ្នកចង់អនុម័តត្រានេះទេ?</i>`;

    const reply_markup = {
        inline_keyboard: [[
            { text: "អនុម័ត ✅", callback_data: `approve_${stampId}` },
            { text: "បដិសេធ ✗", callback_data: `reject_${stampId}` },
        ]],
    };

    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: "HTML",
                reply_markup,
            }),
        });

        const body = await res.json() as any;
        if (!res.ok || !body.ok) {
            console.error("❌ [Telegram Approval Error]", body);
            return { success: false, error: body.description || "Unknown error" };
        }

        console.log(`✅ [Telegram] Approval request sent for stamp #${stampId}`);
        return { success: true, messageId: body.result.message_id };
    } catch (error: any) {
        console.error("❌ [Telegram Exception]", error);
        return { success: false, error: error.message };
    }
}

/** Edit an existing message after approval/rejection to show the result. */
export async function editTelegramApprovalMessage(
    messageId: number,
    username: string,
    approved: boolean,
    approvedBy: "web" | "telegram" = "telegram",
): Promise<void> {
    const { token, chatId } = await getTelegramCredentials();
    if (!token || !chatId) return;

    const statusText = approved
        ? `✅ <b>បានអនុម័តហើយ!</b>`
        : `❌ <b>បានបដិសេធហើយ!</b>`;

    const byText = approvedBy === "web"
        ? `🖥 <i>ដំណើរការដោយ Admin (Web)</i>`
        : `📱 <i>ដំណើរការដោយ Admin (Telegram)</i>`;

    const text =
        `☕ <b>ត្រារបស់ ${escapeTelegramHTML(username)}</b>\n\n` +
        `${statusText}\n` +
        `${byText}`;

    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text,
                parse_mode: "HTML",
                reply_markup: { inline_keyboard: [] },
            }),
        });
        if (!res.ok) {
            const err = await res.text();
            console.error("❌ [Telegram Edit Failed]", err);
        }
    } catch (e) {
        console.error("❌ [Telegram Edit Error]", e);
    }
}

/** Fetch pending callback_query updates from Telegram.
 *  offset = last processed update_id + 1 to avoid re-processing. */
export async function getTelegramUpdates(
    offset: number,
): Promise<{ updateId: number; callbackQueryId: string; data: string; messageId: number; date?: number }[]> {
    const { token } = await getTelegramCredentials();
    if (!token) return [];

    try {
        const res = await fetch(
            `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=0&allowed_updates=["callback_query"]`,
        );
        const body = await res.json() as any;
        if (!body.ok) return [];

        return (body.result as any[])
            .filter((u: any) => u.callback_query)
            .map((u: any) => ({
                updateId: u.update_id,
                callbackQueryId: u.callback_query.id,
                data: u.callback_query.data as string,
                messageId: u.callback_query.message?.message_id,
                date: u.callback_query.message?.date as number | undefined,
            }));
    } catch {
        return [];
    }
}

/** Drain ALL pending updates (any type) and return the highest update_id seen.
 *  Used on server startup to skip stale callbacks. */
export async function drainAllTelegramUpdates(): Promise<number> {
    const { token } = await getTelegramCredentials();
    if (!token) return 0;

    try {
        const res = await fetch(
            `https://api.telegram.org/bot${token}/getUpdates?offset=0&timeout=0&limit=100`,
        );
        const body = await res.json() as any;
        if (!body.ok || !body.result?.length) return 0;

        const maxId: number = Math.max(...(body.result as any[]).map((u: any) => u.update_id as number));

        // ACK all updates up to maxId by passing offset = maxId + 1
        await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${maxId + 1}&timeout=0`);

        return maxId;
    } catch {
        return 0;
    }
}

/** Acknowledge a callback query so Telegram removes the loading spinner. */
export async function answerCallbackQuery(
    callbackQueryId: string,
    text: string,
): Promise<void> {
    const { token } = await getTelegramCredentials();
    if (!token) return;

    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
    }).catch(() => { });
}
