import { GoogleGenAI } from "@google/genai";
import { 
  getStoredGeminiApiKey, 
  getAIHeaders, 
  AIProvider, 
  AI_PROVIDERS, 
  getActiveApiKeyInfo,
  isAutoSwitchAIEnabled,
  getAIProviderCandidates,
  setActiveAIProvider,
  notifyAIAutoSwitched
} from "./geminiKey";
import { getApiUrl } from "./apiUrl";

// Allowed fallback models for Gemini
const FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-3.7-flash",
];

/**
 * Universal test connection tester across all supported AI providers
 */
export async function testAIProviderConnection(
  provider: AIProvider,
  rawKey: string
): Promise<{ success: boolean; message: string }> {
  const cleanKey = (rawKey || "").trim().replace(/^["'`]|["'`]$/g, "").trim();
  if (!cleanKey) {
    return { success: false, message: "Please paste your API key first." };
  }

  const meta = AI_PROVIDERS[provider];
  if (!meta) {
    return { success: false, message: "Unknown AI provider." };
  }

  if (provider === "gemini") {
    try {
      const ai = new GoogleGenAI({ apiKey: cleanKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: "Respond with 'OK' if you can read this." }] }],
      });

      if (response && response.text) {
        return {
          success: true,
          message: `Connected successfully to Google Gemini 2.5 Flash!`,
        };
      }
      throw new Error("No response returned from model.");
    } catch (err: any) {
      const msg = String(err?.message || err || "");
      let friendlyError = "Failed to connect with this key. Please check your Google AI Studio key.";
      if (msg.includes("API_KEY_INVALID") || msg.includes("API key not valid") || msg.includes("UNAUTHENTICATED")) {
        friendlyError = "Invalid API Key. Please copy your key directly from Google AI Studio.";
      } else if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
        friendlyError = "API key is valid, but current rate limit is reached. Please try again shortly.";
      }
      return { success: false, message: friendlyError };
    }
  }

  // Test OpenAI-compatible endpoints (Groq, OpenAI, OpenRouter, DeepSeek)
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cleanKey}`,
    };

    if (provider === "openrouter") {
      headers["HTTP-Referer"] = typeof window !== "undefined" ? window.location.origin : "https://upcat.app";
      headers["X-Title"] = "Sulyap CET Reviewer";
    }

    const res = await fetch(meta.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: meta.defaultModel,
        messages: [{ role: "user", content: "Respond with 'OK'." }],
        max_tokens: 10,
        temperature: 0.1,
      }),
    });

    const responseText = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(responseText);
    } catch {}

    if (res.ok) {
      return {
        success: true,
        message: `Connected successfully to ${meta.name} (${meta.defaultModel})!`,
      };
    }

    const errDetail = data?.error?.message || data?.message || `Server responded with status ${res.status}`;
    let friendly = `Connection error (${res.status}): ${errDetail}`;
    if (res.status === 401) {
      friendly = `Invalid or unauthorized API key for ${meta.name}. Please check your key.`;
    } else if (res.status === 429) {
      friendly = `Rate limit reached or credits exhausted on ${meta.name}. Please check your account quota.`;
    }
    return { success: false, message: friendly };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to connect to ${meta.name}: ${err?.message || "Network error"}`,
    };
  }
}

/**
 * Executes a request against an OpenAI-compatible API provider (Groq, OpenAI, OpenRouter, DeepSeek)
 */
async function callOpenAICompatibleProvider(
  provider: AIProvider,
  apiKey: string,
  params: {
    systemInstruction?: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    jsonMode?: boolean;
  }
): Promise<string> {
  const meta = AI_PROVIDERS[provider];
  if (!meta) throw new Error(`Unknown provider: ${provider}`);

  const cleanKey = apiKey.trim().replace(/^["'`]|["'`]$/g, "").trim();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${cleanKey}`,
  };

  if (provider === "openrouter") {
    headers["HTTP-Referer"] = typeof window !== "undefined" ? window.location.origin : "https://upcat.app";
    headers["X-Title"] = "Sulyap CET Reviewer";
  }

  const payloadMessages: Array<{ role: string; content: string }> = [];
  if (params.systemInstruction) {
    payloadMessages.push({ role: "system", content: params.systemInstruction });
  }
  for (const m of params.messages) {
    payloadMessages.push({ role: m.role, content: m.content });
  }

  const body: any = {
    model: meta.defaultModel,
    messages: payloadMessages,
    temperature: params.temperature ?? 0.7,
  };

  if (params.jsonMode && provider !== "groq") {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(meta.endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const responseText = await res.text();
  let data: any = {};
  try {
    data = JSON.parse(responseText);
  } catch {}

  if (!res.ok) {
    const errDetail = data?.error?.message || data?.message || `Status ${res.status}`;
    throw new Error(`${meta.name} Error: ${errDetail}`);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`Empty response returned from ${meta.name}.`);
  }

  return content;
}

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
 * Checks if an error represents a quota limit, rate limit, authentication, or transient outage
 * that justifies automatic failover to another AI provider.
 */
export function isRecoverableOrQuotaError(err: any): boolean {
  const msg = String(err?.message || err || "").toLowerCase();
  const status = err?.status || 0;
  return (
    status === 429 ||
    status === 503 ||
    status === 500 ||
    status === 502 ||
    status === 504 ||
    status === 401 ||
    status === 403 ||
    msg.includes("429") ||
    msg.includes("503") ||
    msg.includes("resource_exhausted") ||
    msg.includes("quota") ||
    msg.includes("limit reached") ||
    msg.includes("credits") ||
    msg.includes("insufficient_quota") ||
    msg.includes("api_key_invalid") ||
    msg.includes("unauthenticated") ||
    msg.includes("rate limit") ||
    msg.includes("overloaded") ||
    msg.includes("high demand") ||
    msg.includes("failed to fetch") ||
    msg.includes("network error")
  );
}

/**
 * Executes chat using a single specified provider
 */
async function executeSingleChat(
  provider: AIProvider,
  key: string,
  message: string,
  history: Array<{ role: string; text: string }>
): Promise<string> {
  // Non-Gemini provider (Groq, OpenAI, OpenRouter, DeepSeek)
  if (provider !== "gemini") {
    if (!key) {
      throw new Error(`No API key configured for ${AI_PROVIDERS[provider].name}.`);
    }

    const systemInstruction = `You are "Isko AI", an ultra-fast, brilliant Philippine College Entrance Test (UPCAT, ACET, DCAT, USTET, PLMAT, BUCET) tutor and academic companion.
Provide clear, step-by-step guidance, formulas in KaTeX ($...$ or $$...$$), and practical Filipino test-taking strategies. Always remain encouraging, concise, and academically rigorous.`;

    const messages = [
      ...history.map((h) => ({
        role: h.role === "assistant" || h.role === "model" ? "assistant" : "user",
        content: h.text,
      })),
      { role: "user", content: message },
    ];

    return await callOpenAICompatibleProvider(provider, key, {
      systemInstruction,
      messages,
      temperature: 0.7,
    });
  }

  // Gemini provider: Try server first, then client direct fallback if user has key
  const storedKey = key || getStoredGeminiApiKey();
  const apiBase = getApiUrl();
  const endpoint = `${apiBase.replace(/\/$/, "")}/gemini/chat`;

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

  // Direct client fallback for Gemini key
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
 * Executes a chat interaction with automatic failover across configured AI providers
 * if rate limits, quota exhaustion, or server errors occur.
 */
export async function sendGeminiChatMessage(
  message: string,
  history: Array<{ role: string; text: string }> = []
): Promise<string> {
  const activeInfo = getActiveApiKeyInfo();
  const autoSwitch = isAutoSwitchAIEnabled();

  // If auto-switch is disabled, only execute with the active provider
  if (!autoSwitch) {
    return await executeSingleChat(activeInfo.provider, activeInfo.key, message, history);
  }

  // Auto-failover: gather candidate providers
  const candidates = getAIProviderCandidates(activeInfo.provider);
  // Keep only candidates that are configured with a key, or is Gemini (which has free server credits)
  const viable = candidates.filter((c) => c.isConfigured || c.provider === "gemini");

  let lastError: any = null;

  for (let i = 0; i < viable.length; i++) {
    const candidate = viable[i];
    try {
      const reply = await executeSingleChat(candidate.provider, candidate.key, message, history);

      // If we switched from the original provider to a backup, notify and persist
      if (candidate.provider !== activeInfo.provider) {
        setActiveAIProvider(candidate.provider);
        notifyAIAutoSwitched({
          fromProvider: activeInfo.provider,
          toProvider: candidate.provider,
          fromProviderName: activeInfo.meta.name,
          toProviderName: candidate.meta.name,
          reason: lastError?.message || "Credits ran out or rate limit reached",
          timestamp: Date.now(),
        });
      }

      return reply;
    } catch (err: any) {
      lastError = err;
      console.warn(`[AIFailover] Provider ${candidate.provider} failed:`, err?.message || err);

      // If it's the only viable option or auto-switch shouldn't handle it
      if (!isRecoverableOrQuotaError(err) && viable.length <= 1) {
        throw err;
      }
    }
  }

  throw lastError || new Error("All available AI providers failed. Please check your API keys or switch providers.");
}

/**
 * Executes error explanation using a single specified provider
 */
async function executeSingleExplain(
  provider: AIProvider,
  key: string,
  payload: {
    questionText: string;
    choices: Array<{ id: string; text: string }>;
    correctAnswer: string;
    userAnswer?: string;
    subject?: string;
    explanation?: string;
    userQuery?: string;
  }
): Promise<{
  errorAnalysis: string;
  fastSolution: string;
  keyRuleOrShortcut: string;
  fullTutorResponse: string;
}> {
  // Non-Gemini provider (Groq, OpenAI, OpenRouter, DeepSeek)
  if (provider !== "gemini") {
    if (!key) {
      throw new Error(`No API key configured for ${AI_PROVIDERS[provider].name}.`);
    }

    const prompt = `You are an expert CET (UPCAT, ACET, DCAT, USTET) tutor.
Analyze this exam question, diagnose the error, and provide the rapid solution in Filipino-English context.
Format all mathematical expressions in KaTeX ($...$ or $$...$$).

QUESTION:
${payload.questionText}

CHOICES:
${payload.choices.map((c) => `${c.id}. ${c.text}`).join("\n")}

CORRECT ANSWER: Choice ${payload.correctAnswer}
STUDENT'S ANSWER: ${payload.userAnswer ? `Choice ${payload.userAnswer}` : "Skipped/Blank"}
${payload.userQuery ? `STUDENT'S QUESTION: "${payload.userQuery}"` : ""}

You MUST return valid raw JSON matching this format:
{
  "errorAnalysis": "Specific reason why the student's answer was incorrect and common test trap",
  "fastSolution": "Clean, step-by-step fastest method to find the correct answer with KaTeX $...$",
  "keyRuleOrShortcut": "One golden memory rule, formula, or exam shortcut",
  "fullTutorResponse": "Encouraging, comprehensive tutor explanation with KaTeX formulas"
}`;

    const text = await callOpenAICompatibleProvider(provider, key, {
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      jsonMode: true,
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
        errorAnalysis: "Option analysis generated.",
        fastSolution: text,
        keyRuleOrShortcut: "Always verify question conditions.",
        fullTutorResponse: text,
      };
    }
  }

  // Gemini flow (Server first, client fallback)
  const storedKey = key || getStoredGeminiApiKey();
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

/**
 * Explains a missed question or user question error across all supported providers
 * with automatic failover if rate limits or errors occur.
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
  const activeInfo = getActiveApiKeyInfo();
  const autoSwitch = isAutoSwitchAIEnabled();

  if (!autoSwitch) {
    return await executeSingleExplain(activeInfo.provider, activeInfo.key, payload);
  }

  const candidates = getAIProviderCandidates(activeInfo.provider);
  const viable = candidates.filter((c) => c.isConfigured || c.provider === "gemini");

  let lastError: any = null;

  for (let i = 0; i < viable.length; i++) {
    const candidate = viable[i];
    try {
      const result = await executeSingleExplain(candidate.provider, candidate.key, payload);

      if (candidate.provider !== activeInfo.provider) {
        setActiveAIProvider(candidate.provider);
        notifyAIAutoSwitched({
          fromProvider: activeInfo.provider,
          toProvider: candidate.provider,
          fromProviderName: activeInfo.meta.name,
          toProviderName: candidate.meta.name,
          reason: lastError?.message || "Credits ran out or rate limit reached",
          timestamp: Date.now(),
        });
      }

      return result;
    } catch (err: any) {
      lastError = err;
      console.warn(`[AIFailover] Explain candidate ${candidate.provider} failed:`, err?.message || err);

      if (!isRecoverableOrQuotaError(err) && viable.length <= 1) {
        throw err;
      }
    }
  }

  throw lastError || new Error("All available AI providers failed to generate explanation. Please check your keys.");
}

