import {
  handleGeminiChat,
  handleGenerateMistakeFollowUpQuiz,
  handleExtractQuestionsFromPdfOrText,
  handleGenerateSubjectQuestions,
  handleExplainQuestionError,
} from "../../artifacts/upcat/src/server/geminiHandler";

async function parseBody(req: any) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  if (req.body && typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk: any) => {
      data += chunk;
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch {
        resolve({});
      }
    });
  });
}

function setCors(res: any) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "*, Content-Type, Authorization, x-gemini-api-key, x-api-key, gemini-api-key, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version"
  );
}

export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const url = req.url || "";
  try {
    const body: any = await parseBody(req);
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
    const keyStr = typeof apiKey === "string" && apiKey.trim() ? apiKey.trim() : undefined;

    if (url.includes("extract-pdf")) {
      const questions = await handleExtractQuestionsFromPdfOrText(body || {}, keyStr);
      return res.status(200).json({ questions, count: questions.length });
    }

    if (url.includes("generate-subject-questions")) {
      const questions = await handleGenerateSubjectQuestions(body || {}, keyStr);
      return res.status(200).json({ questions, count: questions.length });
    }

    if (url.includes("explain-error")) {
      const result = await handleExplainQuestionError(body || {}, keyStr);
      return res.status(200).json(result);
    }

    if (url.includes("mistake-quiz")) {
      const { mistakes = [], count = 5 } = body || {};
      const questions = await handleGenerateMistakeFollowUpQuiz(mistakes, count, keyStr);
      return res.status(200).json({ questions });
    }

    if (url.includes("chat") || url.includes("gemini")) {
      const { message, history } = body || {};
      const reply = await handleGeminiChat(message, history, keyStr);
      return res.status(200).json({ reply });
    }

    return res.status(404).json({ error: "Endpoint not found" });
  } catch (err: any) {
    console.error("Vercel Gemini API Error:", err);
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
        : errMsg || "Failed to communicate with AI server. Please check your GEMINI_API_KEY environment variable.",
    });
  }
}
