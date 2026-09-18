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
  notifyAIAutoSwitched,
  getStoredGroqModel,
  saveStoredGroqModel,
  parseCloudflareCredentials,
  saveStoredCloudflareAccountId,
  GROQ_CANDIDATE_MODELS,
} from "./geminiKey";
import { saveUserAISettingsToAccount } from "./userAISettings";
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

  // Test Groq with multi-model auto-detection and fallback
  if (provider === "groq") {
    let candidateModels: string[] = [
      getStoredGroqModel(),
      "llama-3.1-8b-instant",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "qwen/qwen3.6-27b",
      "llama-3.3-70b-versatile",
      "llama3-70b-8192",
      "llama-3-8b-8192",
      "mixtral-8x7b-32768",
    ];
    candidateModels = Array.from(new Set(candidateModels.filter(Boolean)));

    // Try to discover models active on user's Groq key
    try {
      const modelsRes = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${cleanKey}` },
      });
      if (modelsRes.ok) {
        const modelsJson = await modelsRes.json();
        const activeIds: string[] = (modelsJson?.data || [])
          .filter((m: any) => m.active !== false && !m.id?.includes("whisper") && !m.id?.includes("guard"))
          .map((m: any) => m.id);
        if (activeIds.length > 0) {
          const prioritized = candidateModels.filter((m) => activeIds.includes(m));
          const remaining = activeIds.filter((m) => !prioritized.includes(m));
          candidateModels = [...prioritized, ...remaining];
        }
      }
    } catch {
      // Continue with candidate models
    }

    let lastError = "";
    for (const model of candidateModels) {
      try {
        const res = await fetch(meta.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${cleanKey}`,
          },
          body: JSON.stringify({
            model,
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
          saveStoredGroqModel(model);
          saveUserAISettingsToAccount(null, {
            providerKey: { provider: "groq", key: cleanKey },
            groqModel: model,
          }).catch(() => {});

          return {
            success: true,
            message: `Connected successfully to Groq (${model})!`,
          };
        }

        if (res.status === 401) {
          return {
            success: false,
            message: "Invalid or unauthorized API key for Groq. Please check your key at console.groq.com.",
          };
        }

        if (res.status === 404) {
          lastError = data?.error?.message || `Model '${model}' is not available.`;
          continue;
        }

        const errDetail = data?.error?.message || data?.message || `Server responded with status ${res.status}`;
        lastError = errDetail;
      } catch (err: any) {
        lastError = err?.message || "Network error";
      }
    }

    return {
      success: false,
      message: `Failed to connect to Groq: ${lastError || "No accessible model found for this key"}`,
    };
  }

  // Test Cohere (Command R) endpoint
  if (provider === "cohere") {
    try {
      const res = await fetch("https://api.cohere.com/compatibility/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cleanKey}`,
        },
        body: JSON.stringify({
          model: "command-r",
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
        saveUserAISettingsToAccount(null, {
          providerKey: { provider: "cohere", key: cleanKey },
        }).catch(() => {});

        return {
          success: true,
          message: "Connected successfully to Cohere (Command R)! 1,000 free monthly requests active.",
        };
      }

      if (res.status === 401) {
        return {
          success: false,
          message: "Invalid or unauthorized API key for Cohere. Please check your key at dashboard.cohere.com/api-keys.",
        };
      }

      const errDetail = data?.message || data?.error?.message || `Server responded with status ${res.status}`;
      return { success: false, message: `Cohere error (${res.status}): ${errDetail}` };
    } catch (err: any) {
      return { success: false, message: `Failed to connect to Cohere: ${err?.message || "Network error"}` };
    }
  }

  // Test Cloudflare Workers AI endpoint
  if (provider === "cloudflare") {
    const creds = parseCloudflareCredentials(cleanKey);
    if (!creds.accountId || !creds.apiToken) {
      return {
        success: false,
        message: "Please provide both your Cloudflare Account ID and API Token in format ACCOUNT_ID:API_TOKEN, or enter your Account ID in the field above.",
      };
    }

    try {
      // 1. Test Workers AI chat completions
      const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${creds.accountId}/ai/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${creds.apiToken}`,
        },
        body: JSON.stringify({
          model: "@cf/meta/llama-3.1-8b-instruct",
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
        saveStoredCloudflareAccountId(creds.accountId);
        saveUserAISettingsToAccount(null, {
          providerKey: { provider: "cloudflare", key: `${creds.accountId}:${creds.apiToken}` },
          cloudflareAccountId: creds.accountId,
        }).catch(() => {});

        return {
          success: true,
          message: "Connected successfully to Cloudflare Workers AI (Llama 3.1 8B)! 10,000 free daily Neurons active.",
        };
      }

      // 2. Direct run fallback test
      if (res.status === 404) {
        const directRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${creds.accountId}/ai/run/@cf/meta/llama-3.1-8b-instruct`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${creds.apiToken}`,
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: "Respond with 'OK'." }],
            max_tokens: 10,
          }),
        });

        if (directRes.ok) {
          saveStoredCloudflareAccountId(creds.accountId);
          saveUserAISettingsToAccount(null, {
            providerKey: { provider: "cloudflare", key: `${creds.accountId}:${creds.apiToken}` },
            cloudflareAccountId: creds.accountId,
          }).catch(() => {});

          return {
            success: true,
            message: "Connected successfully to Cloudflare Workers AI (Llama 3.1 8B)!",
          };
        }
      }

      if (res.status === 401 || res.status === 403) {
        return {
          success: false,
          message: "Invalid or unauthorized Cloudflare API Token. Ensure your token has 'Workers AI Read' permission.",
        };
      }

      const errDetail = data?.errors?.[0]?.message || data?.error?.message || data?.message || `Status ${res.status}`;
      return { success: false, message: `Cloudflare error (${res.status}): ${errDetail}` };
    } catch (err: any) {
      return { success: false, message: `Failed to connect to Cloudflare Workers AI: ${err?.message || "Network error"}` };
    }
  }

  return { success: false, message: "Unknown AI provider." };
}

/**
 * Executes a request against Cloudflare Workers AI using the OpenAI-compatible v1 endpoint
 * or direct /ai/run endpoint.
 */
async function callCloudflareWorkersAI(
  rawCredentials: string,
  params: {
    systemInstruction?: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    max_tokens?: number;
    jsonMode?: boolean;
  }
): Promise<string> {
  const creds = parseCloudflareCredentials(rawCredentials);
  if (!creds.accountId || !creds.apiToken) {
    throw new Error("Cloudflare Account ID or API Token missing. Please check your Cloudflare settings.");
  }

  const payloadMessages: Array<{ role: string; content: string }> = [];
  if (params.systemInstruction) {
    payloadMessages.push({ role: "system", content: params.systemInstruction });
  }
  for (const m of params.messages) {
    payloadMessages.push({ role: m.role, content: m.content });
  }

  // 1. Try OpenAI-compatible chat completions endpoint
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${creds.accountId}/ai/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${creds.apiToken}`,
      },
      body: JSON.stringify({
        model: "@cf/meta/llama-3.1-8b-instruct",
        messages: payloadMessages,
        temperature: params.temperature ?? 0.5,
        max_tokens: params.max_tokens ?? 800,
        ...(params.jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    const responseText = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(responseText);
    } catch {}

    if (res.ok) {
      const content = data?.choices?.[0]?.message?.content;
      if (content) return content;
    }
  } catch (err) {
    console.warn("[Cloudflare] Chat completions endpoint error, trying direct runner:", err);
  }

  // 2. Direct run endpoint fallback
  const runRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${creds.accountId}/ai/run/@cf/meta/llama-3.1-8b-instruct`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${creds.apiToken}`,
    },
    body: JSON.stringify({
      messages: payloadMessages,
      max_tokens: params.max_tokens ?? 800,
    }),
  });

  const runText = await runRes.text();
  let runData: any = {};
  try {
    runData = JSON.parse(runText);
  } catch {}

  if (runRes.ok) {
    const response = runData?.result?.response || runData?.response;
    if (response) return response;
  }

  const errDetail = runData?.errors?.[0]?.message || runData?.messages?.[0] || `Status ${runRes.status}`;
  throw new Error(`Cloudflare Workers AI Error: ${errDetail}`);
}

/**
 * Executes a request against an OpenAI-compatible API provider (Groq, Cohere)
 */
async function callOpenAICompatibleProvider(
  provider: AIProvider,
  apiKey: string,
  params: {
    systemInstruction?: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    max_tokens?: number;
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

  const payloadMessages: Array<{ role: string; content: string }> = [];
  if (params.systemInstruction) {
    payloadMessages.push({ role: "system", content: params.systemInstruction });
  }
  for (const m of params.messages) {
    payloadMessages.push({ role: m.role, content: m.content });
  }

  let currentModel = meta.defaultModel;
  if (provider === "groq") {
    currentModel = getStoredGroqModel() || "llama-3.1-8b-instant";
  }

  const sendRequest = async (modelName: string) => {
    const body: any = {
      model: modelName,
      messages: payloadMessages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.max_tokens ?? 800,
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

    return { ok: res.ok, status: res.status, data, responseText };
  };

  let result = await sendRequest(currentModel);

  // If Groq returns 404 (model deprecated/unavailable), seamlessly try candidate models
  if (!result.ok && provider === "groq" && result.status === 404) {
    const fallbacks = GROQ_CANDIDATE_MODELS.filter((m) => m !== currentModel);
    for (const altModel of fallbacks) {
      const altResult = await sendRequest(altModel);
      if (altResult.ok) {
        saveStoredGroqModel(altModel);
        saveUserAISettingsToAccount(null, { groqModel: altModel }).catch(() => {});
        result = altResult;
        break;
      }
    }
  }

  if (!result.ok) {
    const errDetail = result.data?.error?.message || result.data?.message || `Status ${result.status}`;
    throw new Error(`${meta.name} Error: ${errDetail}`);
  }

  const content = result.data?.choices?.[0]?.message?.content;
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
  // Cloudflare Workers AI provider
  if (provider === "cloudflare") {
    if (!key) {
      throw new Error(`No credentials configured for Cloudflare Workers AI.`);
    }

    const systemInstruction = `You are "Isko AI", an ultra-fast, accurate Philippine College Entrance Test (UPCAT, ACET, DCAT, USTET, PLMAT, BUCET) tutor.
Be concise, direct, and fast to read (150-250 words max). Skip pleasantries and conversational filler. Directly provide the solution, formulas in KaTeX ($...$ or $$...$$), and 30-second CET exam shortcut tips. Ensure 100% accuracy.`;

    const messages = [
      ...history.slice(-6).map((h) => ({
        role: h.role === "assistant" || h.role === "model" ? "assistant" : "user",
        content: h.text,
      })),
      { role: "user", content: message },
    ];

    return await callCloudflareWorkersAI(key, {
      systemInstruction,
      messages,
      temperature: 0.4,
      max_tokens: 600,
    });
  }

  // Non-Gemini OpenAI-compatible providers (Groq, Cohere)
  if (provider !== "gemini") {
    if (!key) {
      throw new Error(`No API key configured for ${AI_PROVIDERS[provider].name}.`);
    }

    const systemInstruction = `You are "Isko AI", an ultra-fast, accurate Philippine College Entrance Test (UPCAT, ACET, DCAT, USTET, PLMAT, BUCET) tutor.
Be concise, direct, and fast to read (150-250 words max). Skip pleasantries and conversational filler. Directly provide the solution, formulas in KaTeX ($...$ or $$...$$), and 30-second CET exam shortcut tips. Ensure 100% accuracy.`;

    const messages = [
      ...history.slice(-6).map((h) => ({
        role: h.role === "assistant" || h.role === "model" ? "assistant" : "user",
        content: h.text,
      })),
      { role: "user", content: message },
    ];

    return await callOpenAICompatibleProvider(provider, key, {
      systemInstruction,
      messages,
      temperature: 0.4,
      max_tokens: 600,
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

    const systemInstruction = `You are "Isko AI", an ultra-fast, accurate Philippine College Entrance Test (UPCAT, ACET, DCAT, USTET, PLMAT, BUCET) academic tutor.
Be concise, direct, and fast to read (150-250 words max). Skip pleasantries and conversational filler. Directly provide the solution, formulas in KaTeX ($...$ or $$...$$), and 30-second CET exam shortcuts. Ensure 100% mathematical and conceptual accuracy.`;

    return await callDirectClientGemini(storedKey, {
      systemInstruction,
      contents: formattedContents,
      temperature: 0.4,
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
  // Cloudflare Workers AI provider
  if (provider === "cloudflare") {
    if (!key) {
      throw new Error(`No credentials configured for Cloudflare Workers AI.`);
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

    const text = await callCloudflareWorkersAI(key, {
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

  // Non-Gemini OpenAI-compatible providers (Groq, Cohere)
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

