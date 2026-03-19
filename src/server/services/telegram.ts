import { env } from "../../env";

export async function sendTelegramAlert(data: {
  fullName: string;
  age: string;
  phone: string;
  position: string | null;
  eventName: string;
  socialProofs?: string | null;
}) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn(
      "Telegram alert skipped: Bot token or Chat ID not configured.",
    );
    return;
  }

  const message = `
🚀 *មានការចុះឈ្មោះថ្មី!*

👤 *ឈ្មោះពេញ:* ${data.fullName}
🔞 *អាយុ:* ${data.age}
📞 *លេខទូរស័ព្ទ:* ${data.phone}
⚽ *តួនាទី:* ${data.position || "មិនមាន"}
🎉 *កម្មវិធី:* ${data.eventName}

${data.socialProofs ? `🖼️ *មានរូបភាពតាមដានបណ្ដាញសង្គមបញ្ជាក់*` : "មិនមានរូបភាពតាមដានបណ្ដាញសង្គមបញ្ជាក់ទេ។"}

សូមពិនិត្យមើលផ្ទាំងគ្រប់គ្រងសម្រាប់ព័ត៌មានលម្អិតបន្ថែម។
  `.trim();

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown",
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Telegram API error: ${response.status} ${errorText}`);
    }
  } catch (error) {
    console.error("Failed to send Telegram alert:", error);
  }
}
