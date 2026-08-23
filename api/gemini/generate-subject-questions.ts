import { handleGenerateSubjectQuestions } from "../../artifacts/upcat/src/server/geminiHandler";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch {}
    }
    const apiKey =
      (req.headers && (req.headers["x-gemini-api-key"] || req.headers["x-api-key"])) ||
      body?.apiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.VITE_GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.API_KEY ||
      process.env.GEMINI_KEY ||
      process.env.GOOGLE_GENAI_API_KEY;

    const questions = await handleGenerateSubjectQuestions(
      body || {},
      typeof apiKey === "string" && apiKey.trim() ? apiKey.trim() : undefined
    );
    return res.status(200).json({ questions, count: questions.length });
  } catch (err: any) {
    console.error("Vercel Generate Subject Questions Error:", err);
    return res.status(500).json({ error: err.message || "Failed to generate questions" });
  }
}
