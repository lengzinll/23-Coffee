import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../../env";

// Provider Detection
const apiKey =
  env.GEMINI_API_KEY && env.GEMINI_API_KEY !== "no_key"
    ? env.GEMINI_API_KEY
    : null;
const isOpenRouter = apiKey?.startsWith("sk-or-");

// Lazy Gemini SDK Setup
let googleGenAI: GoogleGenerativeAI | null = null;
const getGoogleModel = () => {
  if (!googleGenAI && apiKey) {
    googleGenAI = new GoogleGenerativeAI(apiKey);
  }
  return googleGenAI?.getGenerativeModel({ model: "gemini-2.0-flash-001" });
};

export async function verifyImageProof(
  imageUrl: string,
  platform: string,
  expectedLink: string,
): Promise<{ passed: boolean; reason: string }> {
  if (!apiKey) {
    console.warn(
      `[Gemini] No valid API key set. Bypassing verification for ${platform}.`,
    );
    return { passed: true, reason: "" };
  }

  try {
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) throw new Error(`Failed to fetch image from ${imageUrl}`);
    const imageArrayBuffer = await imageRes.arrayBuffer();
    const base64Image = Buffer.from(imageArrayBuffer).toString("base64");

    let platformPrompt = "";
    if (platform === "telegram") {
      platformPrompt = `
Analyze this Telegram screenshot to verify if the user has joined the group or channel at ${expectedLink}.
Check for these specific indicators:
1. Target Verification: 
   - Is the group/channel name in the screenshot related to "${expectedLink}"? 
   - Note: The display name (e.g., "NSM ISP FT") may differ from the link handle (e.g., "nsmisp3"). As long as they are clearly related, mark the target as correct.
2. Joined Status (CRITICAL):
   - Does it show "Mute" / "Unmute" / "Discuss" at the bottom? (Khmer: "បិទសំឡេង" / "បើកសំឡេង").
   - Is there a message input field visible at the bottom?
   - If the "JOIN", "JOIN GROUP", or "JOIN CHANNEL" button (Khmer: "ចូលរួម") is visible at the bottom, the user has NOT joined yet. You MUST return NO.

CRITICAL: Start your response with exactly "YES" or "NO" on the first line. 
If "NO", you MUST provide a short, clear reason.
`;
    } else if (platform === "facebook") {
      platformPrompt = `
Analyze this Facebook screenshot to verify if the user is CURRENTLY Following or Liked the page at ${expectedLink}.
1. Page Verification: 
   - Is the page name in the screenshot related to "${expectedLink}"? Related names are acceptable.
2. Followed/Liked Status (CRITICAL): 
   - Look for a button that says "Following" (កំពុងតាមដាន) or "Liked" (បានចូលចិត្ត). 
   - IMPORTANT: If you see a blue button that says "Follow" (តាមដាន) with a plus (+) icon, it means they are NOT following. Return NO.
   - DO NOT be confused by "Followed by [Name]". 

CRITICAL: Start your response with exactly "YES" or "NO" on the first line. 
If "NO", you MUST provide a short, clear reason.
`;
    } else if (platform === "tiktok") {
      platformPrompt = `
Analyze this TikTok screenshot to verify if the user is following ${expectedLink}.
1. Profile Verification: Is the TikTok handle or name in the screenshot related to "${expectedLink}"?
2. Following Status (CRITICAL): 
   - Does it show a "Following" (កំពុងតាមដាន) button or a "Friends" (មិត្តភក្តិ) state?
   - If it says "Follow" (តាមដាន) or has a red "Follow" button, return NO.

CRITICAL: Start your response with exactly "YES" or "NO" on the first line. 
If "NO", you MUST provide a short, clear reason.
`;
    } else if (platform === "youtube") {
      platformPrompt = `
Analyze this YouTube screenshot to verify if the user is subscribed to ${expectedLink}.
1. Channel Verification: Is the YouTube channel name in the screenshot related to "${expectedLink}"?
2. Subscribed Status (CRITICAL): 
   - Does it show "Subscribed" (បានចុះឈ្មោះ) or "Subscribed" with a bell icon? 
   - If it still says "Subscribe" (ចុះឈ្មោះ), return NO.

CRITICAL: Start your response with exactly "YES" or "NO" on the first line. 
If "NO", you MUST provide a short, clear reason.
`;
    } else {
      platformPrompt = `
Analyze this screenshot as proof that a user has followed/liked the "${platform}" page at ${expectedLink}.
Check:
1. Target: Does it relate to "${expectedLink}"? (Display names may vary slightly from handles).
2. Status: Is the user in a COMPLETED "Following", "Subscribed", or "Liked" state?
3. If they need to "Follow", "Join", or "Subscribe", return NO.

CRITICAL: Start your response with exactly "YES" or "NO" on the first line. 
If "NO", you MUST provide a short, clear reason.
`;
    }

    const prompt = platformPrompt;

    let responseText = "";

    if (isOpenRouter) {
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://next-play-live.vercel.app",
            "X-Title": "Next Play Live",
          },
          body: JSON.stringify({
            model: "google/gemini-2.0-flash-001",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  {
                    type: "image_url",
                    image_url: { url: `data:image/jpeg;base64,${base64Image}` },
                  },
                ],
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API failed: ${error}`);
      }

      const data = await response.json();
      responseText = data.choices?.[0]?.message?.content || "NO: API Error";
    } else {
      const model = getGoogleModel();
      if (!model) throw new Error("Google Gemini Model not initialized");

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Image,
            mimeType: "image/jpeg",
          },
        },
      ]);
      responseText = result.response.text().trim();
    }

    console.log(
      `[Gemini Verification] Platform: ${platform}, URL: ${expectedLink} (${isOpenRouter ? "OpenRouter" : "Google SDK"})`,
    );
    console.log(`[Gemini Response]: ${responseText}`);

    const passed =
      responseText.toUpperCase().startsWith("YES") ||
      responseText.trim().toUpperCase().endsWith("YES");
    const reason = passed
      ? ""
      : responseText.replace(/^NO[:.\s]*/i, "").trim() ||
        "Screenshot did not pass verification";

    return { passed, reason };
  } catch (error: unknown) {
    const err = error as Error;
    console.error(
      `Gemini verification failed for ${platform}:`,
      err.message || err,
    );
    return { passed: true, reason: "" }; // Fallback
  }
}
