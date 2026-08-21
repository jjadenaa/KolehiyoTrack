import { handleGenerateMistakeFollowUpQuiz } from "../../artifacts/upcat/src/server/geminiHandler";

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
    const { mistakes = [], count = 5 } = body || {};
    const questions = await handleGenerateMistakeFollowUpQuiz(mistakes, count);
    return res.status(200).json({ questions });
  } catch (err: any) {
    console.error("Vercel Mistake Quiz Error:", err);
    return res.status(500).json({ error: err.message || "Failed to generate mistake quiz" });
  }
}
