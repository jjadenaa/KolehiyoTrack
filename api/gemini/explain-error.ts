import { handleExplainQuestionError } from "../../artifacts/upcat/src/server/geminiHandler";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "*, Content-Type, Authorization, x-gemini-api-key, x-api-key, gemini-api-key, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version"
  );
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch {}
    }
    const apiKey =
      (req.headers && (req.headers["x-gemini-api-key"] || req.headers["x-api-key"] || req.headers["gemini-api-key"])) ||
      body?.apiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.VITE_GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.API_KEY ||
      process.env.GEMINI_KEY ||
      process.env.GOOGLE_GENAI_API_KEY ||
      process.env.GOOGLE_AI_KEY;

    const result = await handleExplainQuestionError(
      body || {},
      typeof apiKey === "string" && apiKey.trim() ? apiKey.trim() : undefined
    );
    return res.status(200).json(result);
  } catch (err: any) {
    console.error("Vercel Explain Error:", err);
    const errMsg = String(err?.message || err || "");
    const isAuth =
      errMsg.includes("API_KEY_INVALID") ||
      errMsg.includes("API key not valid") ||
      errMsg.includes("API key is required") ||
      errMsg.includes("GEMINI_API_KEY is not set") ||
      errMsg.includes("UNAUTHENTICATED");

    return res.status(isAuth ? 401 : 500).json({
      error: isAuth
        ? "Gemini API key is missing or invalid. Please configure GEMINI_API_KEY in your environment or click Enter API Key in the UI."
        : errMsg || "Failed to explain mistake",
    });
  }
}
