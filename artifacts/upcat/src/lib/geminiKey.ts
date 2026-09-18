/**
 * Helper to get/set AI Provider and API Keys across storage and environment.
 * Supports 100% free engines: Google Gemini, Groq, Cohere, and Cloudflare Workers AI.
 */

export type AIProvider = "gemini" | "groq" | "cohere" | "cloudflare";

export interface AIProviderMeta {
  id: AIProvider;
  name: string;
  tagline: string;
  badge: string;
  freeTier: boolean;
  getKeyUrl: string;
  getKeyLabel: string;
  placeholder: string;
  defaultModel: string;
  description: string;
  endpoint: string;
}

export const AI_PROVIDERS: Record<AIProvider, AIProviderMeta> = {
  gemini: {
    id: "gemini",
    name: "Google Gemini",
    tagline: "Official Google AI Studio (Recommended & Free)",
    badge: "Free Tier",
    freeTier: true,
    getKeyUrl: "https://aistudio.google.com/app/apikey",
    getKeyLabel: "Get Free Key at Google AI Studio",
    placeholder: "AIzaSy...",
    defaultModel: "gemini-2.5-flash",
    description: "Official Google Gemini 2.5 Flash / 2.0 Flash with native STEM & KaTeX support. Generous free daily tier with zero credit card required.",
    endpoint: "https://generativelanguage.googleapis.com",
  },
  groq: {
    id: "groq",
    name: "Groq",
    tagline: "Ultra-Fast LPU Inference (100% Free Tier)",
    badge: "Free & Ultra-Fast",
    freeTier: true,
    getKeyUrl: "https://console.groq.com/keys",
    getKeyLabel: "Get Free Key at Groq Console",
    placeholder: "gsk_...",
    defaultModel: "llama-3.1-8b-instant",
    description: "Blazing fast inference speed running Meta Llama 3.1 8B Instant and open models on Groq LPUs. Completely free tier available at console.groq.com.",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
  },
  cohere: {
    id: "cohere",
    name: "Cohere (Command R)",
    tagline: "Command R & Deep Reading (100% Free Trial)",
    badge: "Free 1k/Month",
    freeTier: true,
    getKeyUrl: "https://dashboard.cohere.com/api-keys",
    getKeyLabel: "Get Free Key at Cohere Dashboard",
    placeholder: "co_...",
    defaultModel: "command-r",
    description: "Purpose-built by Cohere for long reading passages, textual analysis, and nuanced reasoning. 1,000 free requests per month with no credit card required.",
    endpoint: "https://api.cohere.com/compatibility/v1/chat/completions",
  },
  cloudflare: {
    id: "cloudflare",
    name: "Cloudflare Workers AI",
    tagline: "Edge Llama 3.1 (100% Free Daily Tier)",
    badge: "Free 10k Neurons/Day",
    freeTier: true,
    getKeyUrl: "https://dash.cloudflare.com",
    getKeyLabel: "Get Token at Cloudflare Dashboard",
    placeholder: "ACCOUNT_ID:API_TOKEN or API Token",
    defaultModel: "@cf/meta/llama-3.1-8b-instruct",
    description: "Runs Meta Llama 3.1 8B directly on Cloudflare's decentralized global edge network. 10,000 free Neurons every day with zero payment required.",
    endpoint: "https://api.cloudflare.com/client/v4/accounts",
  },
};

const GEMINI_STORAGE_KEYS = [
  "gemini_api_key",
  "sulyap_gemini_api_key",
  "upcat_gemini_api_key",
  "kolehiyotrack_gemini_api_key",
  "gemini_custom_api_key",
];

const ACTIVE_PROVIDER_STORAGE_KEY = "sulyap_active_ai_provider";
const GROQ_MODEL_STORAGE_KEY = "sulyap_groq_model";
const CLOUDFLARE_ACCOUNT_ID_KEY = "sulyap_cloudflare_account_id";

export const GROQ_CANDIDATE_MODELS: string[] = [
  "llama-3.1-8b-instant",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.6-27b",
  "llama-3.3-70b-versatile",
  "llama3-70b-8192",
  "llama-3-8b-8192",
  "mixtral-8x7b-32768",
];

export function getStoredGroqModel(): string {
  if (typeof window === "undefined") return "llama-3.1-8b-instant";
  try {
    const saved = localStorage.getItem(GROQ_MODEL_STORAGE_KEY);
    if (saved && saved.trim()) return saved.trim();
  } catch {}
  return "llama-3.1-8b-instant";
}

export function saveStoredGroqModel(model: string): void {
  if (typeof window === "undefined") return;
  try {
    if (model && model.trim()) {
      localStorage.setItem(GROQ_MODEL_STORAGE_KEY, model.trim());
    } else {
      localStorage.removeItem(GROQ_MODEL_STORAGE_KEY);
    }
  } catch {}
}

export function getStoredCloudflareAccountId(): string {
  if (typeof window === "undefined") return "";
  try {
    const saved = localStorage.getItem(CLOUDFLARE_ACCOUNT_ID_KEY);
    if (saved && saved.trim()) return saved.trim();
  } catch {}
  return "";
}

export function saveStoredCloudflareAccountId(accountId: string): void {
  if (typeof window === "undefined") return;
  try {
    const clean = (accountId || "").trim();
    if (clean) {
      localStorage.setItem(CLOUDFLARE_ACCOUNT_ID_KEY, clean);
    } else {
      localStorage.removeItem(CLOUDFLARE_ACCOUNT_ID_KEY);
    }
    window.dispatchEvent(new Event("sulyap_ai_key_changed"));
  } catch {}
}

export function parseCloudflareCredentials(rawKey: string): { accountId: string; apiToken: string } {
  const clean = (rawKey || "").trim();
  if (clean.includes(":")) {
    const idx = clean.indexOf(":");
    return { accountId: clean.slice(0, idx).trim(), apiToken: clean.slice(idx + 1).trim() };
  }
  if (clean.includes("/") && !clean.startsWith("http")) {
    const idx = clean.indexOf("/");
    return { accountId: clean.slice(0, idx).trim(), apiToken: clean.slice(idx + 1).trim() };
  }
  const storedId = getStoredCloudflareAccountId();
  return { accountId: storedId, apiToken: clean };
}

export function getActiveAIProvider(): AIProvider {
  if (typeof window === "undefined") return "gemini";
  try {
    const val = localStorage.getItem(ACTIVE_PROVIDER_STORAGE_KEY) as AIProvider;
    if (val && AI_PROVIDERS[val]) {
      return val;
    }
  } catch {}
  return "gemini";
}

export function setActiveAIProvider(provider: AIProvider): void {
  if (typeof window === "undefined") return;
  try {
    if (AI_PROVIDERS[provider]) {
      localStorage.setItem(ACTIVE_PROVIDER_STORAGE_KEY, provider);
      // Dispatch custom event so listeners can update reactively
      window.dispatchEvent(new Event("sulyap_ai_key_changed"));
    }
  } catch {}
}

export function getStoredApiKeyForProvider(provider: AIProvider): string {
  if (typeof window === "undefined") return "";

  if (provider === "gemini") {
    return getStoredGeminiApiKey();
  }

  try {
    const key = localStorage.getItem(`sulyap_${provider}_api_key`);
    if (key && key.trim().length > 0) {
      return key.trim();
    }
  } catch {}

  return "";
}

export function saveStoredApiKeyForProvider(provider: AIProvider, key: string): void {
  if (typeof window === "undefined") return;
  const trimmed = (key || "").trim().replace(/^["'`]|["'`]$/g, "").trim();

  if (provider === "gemini") {
    saveStoredGeminiApiKey(trimmed);
    return;
  }

  try {
    const storageKey = `sulyap_${provider}_api_key`;
    if (trimmed) {
      localStorage.setItem(storageKey, trimmed);
    } else {
      localStorage.removeItem(storageKey);
    }
    window.dispatchEvent(new Event("sulyap_ai_key_changed"));
  } catch {}
}

export function getStoredGeminiApiKey(): string {
  if (typeof window === "undefined") return "";

  for (const key of GEMINI_STORAGE_KEYS) {
    try {
      const val = localStorage.getItem(key);
      if (val && val.trim().length > 0) {
        return val.trim().replace(/^["'`]|["'`]$/g, "").trim();
      }
    } catch {
      // ignore localStorage read error
    }
  }

  // Check if injected by Vite env
  try {
    const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (envKey && typeof envKey === "string" && envKey.trim().length > 0) {
      return envKey.trim();
    }
  } catch {
    // ignore
  }

  return "";
}

export function saveStoredGeminiApiKey(key: string): void {
  if (typeof window === "undefined") return;
  const trimmed = (key || "").trim().replace(/^["'`]|["'`]$/g, "").trim();

  for (const k of GEMINI_STORAGE_KEYS) {
    try {
      if (trimmed) {
        localStorage.setItem(k, trimmed);
      } else {
        localStorage.removeItem(k);
      }
    } catch {
      // ignore
    }
  }
  try {
    window.dispatchEvent(new Event("sulyap_ai_key_changed"));
  } catch {}
}

/**
 * Checks if user has configured ANY custom API key (Gemini, Groq, Cohere, Cloudflare)
 */
export function hasAnyCustomApiKey(): boolean {
  const activeProvider = getActiveAIProvider();
  const activeKey = getStoredApiKeyForProvider(activeProvider);
  if (activeKey) return true;

  // Check other providers if active is empty
  const providers: AIProvider[] = ["gemini", "groq", "cohere", "cloudflare"];
  for (const p of providers) {
    if (getStoredApiKeyForProvider(p)) return true;
  }
  return false;
}

export function getActiveApiKeyInfo(): {
  provider: AIProvider;
  meta: AIProviderMeta;
  key: string;
  hasKey: boolean;
} {
  const provider = getActiveAIProvider();
  let key = getStoredApiKeyForProvider(provider);

  // If active provider has no key, check if another provider has one configured
  if (!key) {
    const providers: AIProvider[] = ["gemini", "groq", "cohere", "cloudflare"];
    for (const p of providers) {
      const existing = getStoredApiKeyForProvider(p);
      if (existing) {
        return {
          provider: p,
          meta: AI_PROVIDERS[p],
          key: existing,
          hasKey: true,
        };
      }
    }
  }

  return {
    provider,
    meta: AI_PROVIDERS[provider],
    key,
    hasKey: Boolean(key),
  };
}

export function getAIHeaders(additionalHeaders: Record<string, string> = {}): Record<string, string> {
  const info = getActiveApiKeyInfo();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...additionalHeaders,
  };

  if (info.hasKey) {
    headers["x-ai-provider"] = info.provider;
    headers["x-ai-key"] = info.key;
    headers["x-api-key"] = info.key;
    if (info.provider === "gemini") {
      headers["x-gemini-api-key"] = info.key;
    }
  }

  return headers;
}

const AUTO_SWITCH_STORAGE_KEY = "sulyap_ai_auto_switch_enabled";

export function isAutoSwitchAIEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const val = localStorage.getItem(AUTO_SWITCH_STORAGE_KEY);
    if (val !== null) {
      return val === "true";
    }
  } catch {}
  return true; // Default to true for smooth user experience
}

export function setAutoSwitchAIEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUTO_SWITCH_STORAGE_KEY, String(enabled));
    window.dispatchEvent(new Event("sulyap_ai_key_changed"));
  } catch {}
}

export interface AutoSwitchEventDetail {
  fromProvider: AIProvider;
  toProvider: AIProvider;
  fromProviderName: string;
  toProviderName: string;
  reason: string;
  timestamp: number;
}

export function notifyAIAutoSwitched(detail: AutoSwitchEventDetail): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent("sulyap_ai_auto_switched", { detail }));
    window.dispatchEvent(new Event("sulyap_ai_key_changed"));
  } catch {}
}

/**
 * Returns ordered list of providers for failover.
 * The active provider comes first, followed by other configured providers (with keys),
 * and finally unconfigured fallback providers.
 */
export function getAIProviderCandidates(currentProvider?: AIProvider): Array<{
  provider: AIProvider;
  meta: AIProviderMeta;
  key: string;
  isConfigured: boolean;
}> {
  const active = currentProvider || getActiveAIProvider();
  const allProviders: AIProvider[] = ["gemini", "groq", "cohere", "cloudflare"];

  const configuredOther: AIProvider[] = [];
  const unconfigured: AIProvider[] = [];

  for (const p of allProviders) {
    if (p === active) continue;
    const key = getStoredApiKeyForProvider(p);
    if (key) {
      configuredOther.push(p);
    } else {
      unconfigured.push(p);
    }
  }

  const orderedProviders = [active, ...configuredOther, ...unconfigured];
  return orderedProviders.map((p) => {
    const key = getStoredApiKeyForProvider(p);
    return {
      provider: p,
      meta: AI_PROVIDERS[p],
      key,
      isConfigured: Boolean(key),
    };
  });
}

