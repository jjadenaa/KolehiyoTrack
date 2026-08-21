import type { Plugin } from "vite";
import {
  handleGeminiChat,
  handleGenerateMistakeFollowUpQuiz,
  handleExtractQuestionsFromPdfOrText,
  handleGenerateSubjectQuestions,
  handleExplainQuestionError,
} from "./geminiHandler";

// Rate limiter state: sliding window of request timestamps
const requestTimestamps: number[] = [];
const MAX_REQUESTS_PER_MINUTE = 20;
const WINDOW_SIZE_MS = 60 * 1000;

function checkServerRateLimit(): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  // Filter out timestamps older than 1 minute
  while (requestTimestamps.length > 0 && requestTimestamps[0] < now - WINDOW_SIZE_MS) {
    requestTimestamps.shift();
  }

  if (requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    const oldestInWindow = requestTimestamps[0];
    const retryAfterSeconds = Math.ceil((oldestInWindow + WINDOW_SIZE_MS - now) / 1000);
    return { allowed: false, retryAfterSeconds: Math.max(1, retryAfterSeconds) };
  }

  requestTimestamps.push(now);
  return { allowed: true };
}

function normalizeErrorMessage(err: any): { statusCode: number; message: string } {
  let statusCode = 500;
  let message = "An error occurred while communicating with Gemini AI.";

  const rawMsg = typeof err === "string" ? err : String(err?.message || err || "");

  if (err?.status === 429 || rawMsg.includes("429") || rawMsg.includes("RESOURCE_EXHAUSTED")) {
    statusCode = 429;
    message = "AI request limit reached. Please wait a moment before sending another request.";
  } else if (err?.status === 503 || rawMsg.includes("503") || rawMsg.includes("UNAVAILABLE") || rawMsg.includes("high demand") || rawMsg.includes("overloaded")) {
    statusCode = 503;
    message = "The AI service is currently experiencing high demand. Please try again in a few moments.";
  } else if (rawMsg) {
    try {
      // Handles ApiError: {"error":{"code":503,"message":...}}
      const jsonStart = rawMsg.indexOf("{");
      if (jsonStart !== -1) {
        const parsed = JSON.parse(rawMsg.slice(jsonStart));
        if (parsed?.error?.message) {
          message = parsed.error.message;
          if (parsed.error.code === 503 || parsed.error.status === "UNAVAILABLE") {
            statusCode = 503;
            message = "The AI model is currently experiencing high demand. Please try again in a few moments.";
          } else if (parsed.error.code === 429 || parsed.error.status === "RESOURCE_EXHAUSTED") {
            statusCode = 429;
            message = "AI request limit reached. Please wait a moment before sending another request.";
          }
        } else {
          message = rawMsg;
        }
      } else {
        message = rawMsg;
      }
    } catch {
      message = rawMsg;
    }
  }

  return { statusCode, message };
}

export function geminiApiPlugin(): Plugin {
  const chatHandler = (req: any, res: any) => {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }

    const rateCheck = checkServerRateLimit();
    if (!rateCheck.allowed) {
      res.statusCode = 429;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: `Rate limit: Please wait ${rateCheck.retryAfterSeconds}s before sending another AI message.` }));
      return;
    }

    let body = "";
    req.on("data", (chunk: any) => {
      body += chunk;
    });

    req.on("end", async () => {
      try {
        const parsed = JSON.parse(body || "{}");
        const { message, history } = parsed;
        const customApiKey = (req.headers["x-gemini-api-key"] as string) || parsed.apiKey;
        const reply = await handleGeminiChat(message, history, customApiKey);

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ reply }));
      } catch (err: any) {
        console.error("Gemini API Error:", err);
        const { statusCode, message } = normalizeErrorMessage(err);
        res.statusCode = statusCode;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: message }));
      }
    });
  };

  const mistakeQuizHandler = (req: any, res: any) => {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }

    const rateCheck = checkServerRateLimit();
    if (!rateCheck.allowed) {
      res.statusCode = 429;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: `Rate limit: Please wait ${rateCheck.retryAfterSeconds}s before generating another quiz.` }));
      return;
    }

    let body = "";
    req.on("data", (chunk: any) => {
      body += chunk;
    });

    req.on("end", async () => {
      try {
        const parsed = JSON.parse(body || "{}");
        const { mistakes = [], count = 5 } = parsed;
        const customApiKey = (req.headers["x-gemini-api-key"] as string) || parsed.apiKey;
        const questions = await handleGenerateMistakeFollowUpQuiz(mistakes, count, customApiKey);

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ questions }));
      } catch (err: any) {
        console.error("Gemini Mistake Quiz API Error:", err);
        const { statusCode, message } = normalizeErrorMessage(err);
        res.statusCode = statusCode;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: message }));
      }
    });
  };

  const extractPdfHandler = (req: any, res: any) => {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }

    const rateCheck = checkServerRateLimit();
    if (!rateCheck.allowed) {
      res.statusCode = 429;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: `Rate limit: Please wait ${rateCheck.retryAfterSeconds}s before scanning another document.` }));
      return;
    }

    let body = "";
    req.on("data", (chunk: any) => {
      body += chunk;
    });

    req.on("end", async () => {
      try {
        const parsed = JSON.parse(body || "{}");
        const customApiKey = (req.headers["x-gemini-api-key"] as string) || parsed.apiKey;
        const questions = await handleExtractQuestionsFromPdfOrText(parsed, customApiKey);
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ questions, count: questions.length }));
      } catch (err: any) {
        console.error("Gemini Extract PDF Error:", err);
        const { statusCode, message } = normalizeErrorMessage(err);
        res.statusCode = statusCode;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: message }));
      }
    });
  };

  const generateSubjectHandler = (req: any, res: any) => {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }

    const rateCheck = checkServerRateLimit();
    if (!rateCheck.allowed) {
      res.statusCode = 429;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: `Rate limit: Please wait ${rateCheck.retryAfterSeconds}s before generating questions.` }));
      return;
    }

    let body = "";
    req.on("data", (chunk: any) => {
      body += chunk;
    });

    req.on("end", async () => {
      try {
        const parsed = JSON.parse(body || "{}");
        const customApiKey = (req.headers["x-gemini-api-key"] as string) || parsed.apiKey;
        const questions = await handleGenerateSubjectQuestions(parsed, customApiKey);
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ questions, count: questions.length }));
      } catch (err: any) {
        console.error("Gemini Generate Subject Questions Error:", err);
        const { statusCode, message } = normalizeErrorMessage(err);
        res.statusCode = statusCode;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: message }));
      }
    });
  };

  const explainErrorHandler = (req: any, res: any) => {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }

    const rateCheck = checkServerRateLimit();
    if (!rateCheck.allowed) {
      res.statusCode = 429;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: `Rate limit: Please wait ${rateCheck.retryAfterSeconds}s before asking another question.` }));
      return;
    }

    let body = "";
    req.on("data", (chunk: any) => {
      body += chunk;
    });

    req.on("end", async () => {
      try {
        const parsed = JSON.parse(body || "{}");
        const customApiKey = (req.headers["x-gemini-api-key"] as string) || parsed.apiKey;
        const result = await handleExplainQuestionError(parsed, customApiKey);
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(result));
      } catch (err: any) {
        console.error("Gemini Explain Error:", err);
        const { statusCode, message } = normalizeErrorMessage(err);
        res.statusCode = statusCode;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: message }));
      }
    });
  };

  const routeRequest = (req: any, res: any, next: any) => {
    const url = req.originalUrl || req.url || "";
    if (url.includes("/api/gemini/extract-pdf")) {
      extractPdfHandler(req, res);
    } else if (url.includes("/api/gemini/generate-subject-questions")) {
      generateSubjectHandler(req, res);
    } else if (url.includes("/api/gemini/explain-error")) {
      explainErrorHandler(req, res);
    } else if (url.includes("/api/gemini/mistake-quiz")) {
      mistakeQuizHandler(req, res);
    } else if (url.includes("/api/gemini/chat")) {
      chatHandler(req, res);
    } else {
      next();
    }
  };

  return {
    name: "gemini-api-plugin",
    configureServer(server) {
      server.middlewares.use(routeRequest);
    },
    configurePreviewServer(server) {
      server.middlewares.use(routeRequest);
    },
  };
}
