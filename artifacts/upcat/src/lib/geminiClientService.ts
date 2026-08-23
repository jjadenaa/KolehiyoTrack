import { GoogleGenAI } from "@google/genai";
import { getStoredGeminiApiKey, getAIHeaders } from "./geminiKey";
import { getApiUrl } from "./apiUrl";

// Allowed fallback models
const FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-3.7-flash",
];

/**
 * Direct client-side Gemini fallback caller for when the server API is unavailable
 * or when the user provides a custom API key in the UI.
 */
async function callDirectClientGemini(
  apiKey: string,
  params: {
    systemInstruction?: string;
    contents: any[];
    responseSchema?: any;
    temperature?: number;
  }
): Promise<string> {
  const cleanKey = apiKey.trim().replace(/^["'`]|["'`]$/g, "").trim();
  if (!cleanKey) {
    throw new Error("Invalid API key.");
  }

  let lastError: any = null;

  for (const model of FALLBACK_MODELS) {
    try {
      const ai = new GoogleGenAI({ apiKey: cleanKey });
      const config: any = {};
      if (params.systemInstruction) config.systemInstruction = params.systemInstruction;
      if (params.temperature !== undefined) config.temperature = params.temperature;
      if (params.responseSchema) {
        config.responseMimeType = "application/json";
        config.responseSchema = params.responseSchema;
      }

      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config,
      });

      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      lastError = err;
      const errMsg = String(err?.message || err || "");
      console.warn(`[Client Gemini Direct] Model ${model} failed:`, errMsg.slice(0, 100));

      if (
        errMsg.includes("API_KEY_INVALID") ||
        errMsg.includes("API key not valid") ||
        errMsg.includes("UNAUTHENTICATED")
      ) {
        throw new Error("Your Google AI Studio API key is invalid or unauthorized. Please verify your key.");
      }
    }
  }

  throw lastError || new Error("Failed to reach Gemini API with the provided key.");
}

/**
 * Executes a chat interaction, trying the server first, and falling back to direct client if key is present.
 */
export async function sendGeminiChatMessage(
  message: string,
  history: Array<{ role: string; text: string }> = []
): Promise<string> {
  const storedKey = getStoredGeminiApiKey();
  const apiBase = getApiUrl();
  const endpoint = `${apiBase.replace(/\/$/, "")}/gemini/chat`;

  // 1. Try server endpoint first
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: getAIHeaders(),
      body: JSON.stringify({
        message,
        history,
        apiKey: storedKey || undefined,
      }),
    });

    const responseText = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(responseText);
    } catch {
      // Non-JSON response
    }

    if (res.ok && data?.reply) {
      return data.reply;
    }

    if (!res.ok) {
      const errDetail = data?.error || `Server responded with status ${res.status}`;
      // If server failed and we don't have a custom key, throw the server's error
      if (!storedKey) {
        throw new Error(errDetail);
      }
      console.warn("[GeminiClientService] Server chat failed, trying client direct fallback:", errDetail);
    }
  } catch (serverErr: any) {
    if (!storedKey) {
      throw serverErr;
    }
    console.warn("[GeminiClientService] Server connection error, falling back to direct client call:", serverErr);
  }

  // 2. Direct client fallback (when user has configured custom API key in UI)
  if (storedKey) {
    const formattedContents: any[] = [];
    for (const h of history) {
      if (h.text) {
        formattedContents.push({
          role: h.role === "assistant" || h.role === "model" ? "model" : "user",
          parts: [{ text: h.text }],
        });
      }
    }
    formattedContents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const systemInstruction = `You are "Isko AI", an ultra-fast, brilliant Philippine College Entrance Test (UPCAT, ACET, DCAT, USTET, PLMAT, BUCET) tutor and academic companion.
Provide clear, step-by-step guidance, formulas in KaTeX ($...$ or $$...$$), and Filipino test-taking strategies.`;

    return await callDirectClientGemini(storedKey, {
      systemInstruction,
      contents: formattedContents,
      temperature: 0.7,
    });
  }

  throw new Error("Unable to communicate with AI service.");
}

/**
 * Explains a missed question or user question error
 */
export async function explainQuestionError(payload: {
  questionText: string;
  choices: Array<{ id: string; text: string }>;
  correctAnswer: string;
  userAnswer?: string;
  subject?: string;
  explanation?: string;
  userQuery?: string;
}): Promise<{
  errorAnalysis: string;
  fastSolution: string;
  keyRuleOrShortcut: string;
  fullTutorResponse: string;
}> {
  const storedKey = getStoredGeminiApiKey();
  const apiBase = getApiUrl();
  const endpoint = `${apiBase.replace(/\/$/, "")}/gemini/explain-error`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: getAIHeaders(),
      body: JSON.stringify({
        ...payload,
        apiKey: storedKey || undefined,
      }),
    });

    const responseText = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(responseText);
    } catch {}

    if (res.ok && (data?.fullTutorResponse || data?.fastSolution)) {
      return data;
    }

    if (!res.ok) {
      if (!storedKey) {
        throw new Error(data?.error || `Server error (${res.status})`);
      }
    }
  } catch (err: any) {
    if (!storedKey) throw err;
  }

  // Direct client fallback
  if (storedKey) {
    const prompt = `You are an expert CET (UPCAT, ACET, DCAT, USTET) tutor.
Analyze this exam question and explain why the user was mistaken, and how to solve it rapidly:

QUESTION:
${payload.questionText}

CHOICES:
${payload.choices.map((c) => `${c.id}. ${c.text}`).join("\n")}

CORRECT ANSWER: Choice ${payload.correctAnswer}
STUDENT'S ANSWER: ${payload.userAnswer ? `Choice ${payload.userAnswer}` : "Skipped/Blank"}
${payload.userQuery ? `STUDENT'S QUESTION: "${payload.userQuery}"` : ""}

Provide your response in JSON format matching this schema:
{
  "errorAnalysis": "Specific reason why choice ${payload.userAnswer || "blank"} is incorrect and common student trap",
  "fastSolution": "Clean, step-by-step fastest method to find the correct answer with KaTeX $...$",
  "keyRuleOrShortcut": "One golden memory rule, formula, or exam shortcut",
  "fullTutorResponse": "Friendly, encouraging markdown explanation with KaTeX formulas"
}`;

    const text = await callDirectClientGemini(storedKey, {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      temperature: 0.3,
    });

    try {
      const cleanJson = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
      const parsed = JSON.parse(cleanJson);
      return {
        errorAnalysis: parsed.errorAnalysis || "Analysis of the option selected.",
        fastSolution: parsed.fastSolution || "Step-by-step solution.",
        keyRuleOrShortcut: parsed.keyRuleOrShortcut || "Review the core concept.",
        fullTutorResponse: parsed.fullTutorResponse || text,
      };
    } catch {
      return {
        errorAnalysis: "Explanation generated directly.",
        fastSolution: text,
        keyRuleOrShortcut: "Always double-check question constraints.",
        fullTutorResponse: text,
      };
    }
  }

  throw new Error("Unable to generate explanation.");
}
