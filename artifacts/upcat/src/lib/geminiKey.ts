/**
 * Helper to get/set AI Provider and API Keys across storage and environment.
 * Supports Google Gemini, Groq, OpenAI, OpenRouter, and DeepSeek.
 */

export type AIProvider = "gemini" | "groq" | "openai" | "openrouter" | "deepseek";

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
    description: "Official Google Gemini 2.5 Flash / 2.0 Flash with native STEM & KaTeX support. Generous free daily tier with no credit card required.",
    endpoint: "https://generativelanguage.googleapis.com",
  },
  groq: {
    id: "groq",
    name: "Groq (Llama 3.3)",
    tagline: "Ultra-Fast LPU Inference (Free Tier)",
    badge: "Free & Ultra-Fast",
    freeTier: true,
    getKeyUrl: "https://console.groq.com/keys",
    getKeyLabel: "Get Free Key at Groq Console",
    placeholder: "gsk_...",
    defaultModel: "llama-3.3-70b-versatile",
    description: "Blazing fast inference speed running Meta Llama 3.3 70B Versatile on custom Groq hardware. Free tier available.",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
  },
  openai: {
    id: "openai",
    name: "OpenAI (GPT-4o)",
    tagline: "GPT-4o Mini & GPT-4o",
    badge: "High Accuracy",
    freeTier: false,
    getKeyUrl: "https://platform.openai.com/api-keys",
    getKeyLabel: "Get Key at OpenAI Platform",
    placeholder: "sk-proj-...",
    defaultModel: "gpt-4o-mini",
    description: "Industry standard GPT-4o Mini with exceptional step-by-step problem solving and nuanced reading comprehension.",
    endpoint: "https://api.openai.com/v1/chat/completions",
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    tagline: "Unified Multi-Model Gateway",
    badge: "Multi-Model",
    freeTier: true,
    getKeyUrl: "https://openrouter.ai/keys",
    getKeyLabel: "Get Key at OpenRouter",
    placeholder: "sk-or-v1-...",
    defaultModel: "google/gemini-2.5-flash",
    description: "Access hundreds of AI models through a single API key, with both free models and affordable pay-as-you-go options.",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
  },
  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    tagline: "DeepSeek-V3 Reasoning & Chat",
    badge: "Cost-Effective",
    freeTier: false,
    getKeyUrl: "https://platform.deepseek.com/api_keys",
    getKeyLabel: "Get Key at DeepSeek Platform",
    placeholder: "sk-...",
    defaultModel: "deepseek-chat",
    description: "High-capability DeepSeek-V3 model renowned for mathematics, science logic, and thorough conceptual reasoning.",
    endpoint: "https://api.deepseek.com/chat/completions",
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
 * Checks if user has configured ANY custom API key (Gemini, Groq, OpenAI, OpenRouter, DeepSeek)
 */
export function hasAnyCustomApiKey(): boolean {
  const activeProvider = getActiveAIProvider();
  const activeKey = getStoredApiKeyForProvider(activeProvider);
  if (activeKey) return true;

  // Check other providers if active is empty
  const providers: AIProvider[] = ["gemini", "groq", "openai", "openrouter", "deepseek"];
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
    const providers: AIProvider[] = ["gemini", "groq", "openai", "openrouter", "deepseek"];
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
  const allProviders: AIProvider[] = ["gemini", "groq", "openai", "openrouter", "deepseek"];

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

