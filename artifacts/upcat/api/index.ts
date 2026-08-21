import {
  handleGeminiChat,
  handleGenerateMistakeFollowUpQuiz,
  handleExtractQuestionsFromPdfOrText,
  handleGenerateSubjectQuestions,
  handleExplainQuestionError,
} from "../src/server/geminiHandler";

export default async function handler(req: any, res: any) {
  const url = req.url || "";
  try {
    if (req.method === "POST" && url.includes("/api/gemini/extract-pdf")) {
      const questions = await handleExtractQuestionsFromPdfOrText(req.body || {});
      return res.status(200).json({ questions, count: questions.length });
    }
    if (req.method === "POST" && url.includes("/api/gemini/generate-subject-questions")) {
      const questions = await handleGenerateSubjectQuestions(req.body || {});
      return res.status(200).json({ questions, count: questions.length });
    }
    if (req.method === "POST" && url.includes("/api/gemini/explain-error")) {
      const result = await handleExplainQuestionError(req.body || {});
      return res.status(200).json(result);
    }
    if (req.method === "POST" && url.includes("/api/gemini/mistake-quiz")) {
      const { mistakes = [], count = 5 } = req.body || {};
      const questions = await handleGenerateMistakeFollowUpQuiz(mistakes, count);
      return res.status(200).json({ questions });
    }
    if (req.method === "POST" && (url.includes("/api/gemini/chat") || url.includes("/api/gemini"))) {
      const { message, history } = req.body || {};
      const reply = await handleGeminiChat(message, history);
      return res.status(200).json({ reply });
    }
    return res.status(404).json({ error: "API route not found" });
  } catch (err: any) {
    console.error("Vercel Serverless API Error:", err);
    return res.status(500).json({ error: err.message || "AI server error" });
  }
}
