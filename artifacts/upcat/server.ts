import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import {
  handleGeminiChat,
  handleGenerateMistakeFollowUpQuiz,
  handleExtractQuestionsFromPdfOrText,
  handleGenerateSubjectQuestions,
  handleExplainQuestionError,
} from "./src/server/geminiHandler";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json({ limit: "50mb" }));

const geminiRouteHandler = async (req: express.Request, res: express.Response) => {
  try {
    const { message, history } = req.body || {};
    const reply = await handleGeminiChat(message, history);
    res.json({ reply });
  } catch (err: any) {
    console.error("Gemini API Express Error:", err);
    let errorMessage = "An error occurred while communicating with Gemini AI.";
    if (err.status === 503) {
       errorMessage = "The AI model is currently experiencing high demand. Please try again in a few moments.";
    } else if (err.message) {
        try {
            const parsed = JSON.parse(err.message);
            if (parsed.error && parsed.error.message) {
                errorMessage = parsed.error.message;
            } else {
                 errorMessage = err.message;
            }
        } catch {
            errorMessage = err.message;
        }
    }
    res.status(500).json({ error: errorMessage });
  }
};

const geminiMistakeQuizHandler = async (req: express.Request, res: express.Response) => {
  try {
    const { mistakes = [], count = 5 } = req.body || {};
    const questions = await handleGenerateMistakeFollowUpQuiz(mistakes, count);
    res.json({ questions });
  } catch (err: any) {
    console.error("Gemini Mistake Quiz Express Error:", err);
    let errorMessage = "An error occurred while generating mistake follow-up quiz.";
    if (err.message) {
      errorMessage = err.message;
    }
    res.status(500).json({ error: errorMessage });
  }
};

const geminiExtractPdfHandler = async (req: express.Request, res: express.Response) => {
  try {
    const questions = await handleExtractQuestionsFromPdfOrText(req.body || {});
    res.json({ questions, count: questions.length });
  } catch (err: any) {
    console.error("Gemini Extract PDF Express Error:", err);
    res.status(500).json({ error: err.message || "Failed to scan document" });
  }
};

const geminiGenerateSubjectQuestionsHandler = async (req: express.Request, res: express.Response) => {
  try {
    const questions = await handleGenerateSubjectQuestions(req.body || {});
    res.json({ questions, count: questions.length });
  } catch (err: any) {
    console.error("Gemini Generate Subject Questions Express Error:", err);
    res.status(500).json({ error: err.message || "Failed to generate subject questions" });
  }
};

const geminiExplainErrorHandler = async (req: express.Request, res: express.Response) => {
  try {
    const result = await handleExplainQuestionError(req.body || {});
    res.json(result);
  } catch (err: any) {
    console.error("Gemini Explain Error Express Error:", err);
    res.status(500).json({ error: err.message || "Failed to generate explanation" });
  }
};

app.use((req, res, next) => {
  const url = req.originalUrl || req.url;
  if (req.method === 'POST' && url && url.includes("/api/gemini/extract-pdf")) {
    geminiExtractPdfHandler(req, res);
  } else if (req.method === 'POST' && url && url.includes("/api/gemini/generate-subject-questions")) {
    geminiGenerateSubjectQuestionsHandler(req, res);
  } else if (req.method === 'POST' && url && url.includes("/api/gemini/explain-error")) {
    geminiExplainErrorHandler(req, res);
  } else if (req.method === 'POST' && url && url.includes("/api/gemini/mistake-quiz")) {
    geminiMistakeQuizHandler(req, res);
  } else if (req.method === 'POST' && url && url.includes("/api/gemini/chat")) {
    geminiRouteHandler(req, res);
  } else {
    next();
  }
});

// Serve static assets from dist/public (or public if we are inside dist)
const isDist = __dirname.endsWith("dist") || __dirname.endsWith("dist/");
const publicDir = isDist ? path.join(__dirname, "public") : path.join(__dirname, "dist", "public");
app.use(express.static(publicDir));

// SPA fallback for all other GET requests
app.use((_req, res, next) => {
  if (_req.method === 'GET') {
    res.sendFile(path.join(publicDir, "index.html"), (err) => {
      if (err) {
        res.status(404).send("Not found");
      }
    });
  } else {
    next();
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on port ${port}`);
});
