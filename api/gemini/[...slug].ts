import {
  handleGeminiChat,
  handleGenerateMistakeFollowUpQuiz,
  handleExtractQuestionsFromPdfOrText,
  handleGenerateSubjectQuestions,
  handleExplainQuestionError,
} from "../artifacts/upcat/src/server/geminiHandler";

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
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
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

    if (url.includes("extract-pdf")) {
      const questions = await handleExtractQuestionsFromPdfOrText(body || {});
      return res.status(200).json({ questions, count: questions.length });
    }

    if (url.includes("generate-subject-questions")) {
      const questions = await handleGenerateSubjectQuestions(body || {});
      return res.status(200).json({ questions, count: questions.length });
    }

    if (url.includes("explain-error")) {
      const result = await handleExplainQuestionError(body || {});
      return res.status(200).json(result);
    }

    if (url.includes("mistake-quiz")) {
      const { mistakes = [], count = 5 } = body || {};
      const questions = await handleGenerateMistakeFollowUpQuiz(mistakes, count);
      return res.status(200).json({ questions });
    }

    if (url.includes("chat") || url.includes("gemini")) {
      const { message, history } = body || {};
      const reply = await handleGeminiChat(message, history);
      return res.status(200).json({ reply });
    }

    return res.status(404).json({ error: "Endpoint not found" });
  } catch (err: any) {
    console.error("Vercel Gemini API Error:", err);
    return res.status(500).json({
      error: err.message || "Failed to communicate with AI server. Please check your GEMINI_API_KEY environment variable.",
    });
  }
}
