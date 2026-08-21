/**
 * Helper to get/set Gemini API Key across storage and environment
 */

const STORAGE_KEYS = [
  "gemini_api_key",
  "sulyap_gemini_api_key",
  "upcat_gemini_api_key",
  "kolehiyotrack_gemini_api_key",
  "gemini_custom_api_key",
];

export function getStoredGeminiApiKey(): string {
  if (typeof window === "undefined") return "";

  for (const key of STORAGE_KEYS) {
    try {
      const val = localStorage.getItem(key);
      if (val && val.trim().length > 0) {
        return val.trim();
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
  const trimmed = (key || "").trim();

  for (const k of STORAGE_KEYS) {
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
}

export function getAIHeaders(additionalHeaders: Record<string, string> = {}): Record<string, string> {
  const apiKey = getStoredGeminiApiKey();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...additionalHeaders,
  };

  if (apiKey) {
    headers["x-gemini-api-key"] = apiKey;
    headers["x-api-key"] = apiKey;
  }

  return headers;
}
