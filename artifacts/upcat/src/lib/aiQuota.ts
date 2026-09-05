import { useState, useEffect } from "react";
import { 
  hasAnyCustomApiKey, 
  getActiveApiKeyInfo, 
  isAutoSwitchAIEnabled,
  getAIProviderCandidates,
  AIProvider,
  AI_PROVIDERS
} from "./geminiKey";

export const DAILY_AI_CREDITS_LIMIT = 50;
export const MIN_COOLDOWN_MS = 2500; // 2.5s minimum gap between rapid clicks

export interface AIQuotaState {
  date: string; // ISO date YYYY-MM-DD
  usedCount: number;
  lastRequestTimestamp: number;
  featureBreakdown: Record<string, number>;
}

const STORAGE_KEY = "kolehiyotrack_ai_quota_v1";

function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function getStoredQuota(): AIQuotaState {
  const today = getTodayKey();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: AIQuotaState = JSON.parse(raw);
      if (parsed.date === today) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Failed to read AI quota from storage:", err);
  }

  // Reset or initialize for today
  const fresh: AIQuotaState = {
    date: today,
    usedCount: 0,
    lastRequestTimestamp: 0,
    featureBreakdown: {},
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  } catch (err) {
    // Ignore storage write errors
  }
  return fresh;
}

export function getAIQuotaStatus() {
  const hasCustomKey = hasAnyCustomApiKey();
  const info = getActiveApiKeyInfo();
  const quota = getStoredQuota();
  const remaining = hasCustomKey ? 999 : Math.max(0, DAILY_AI_CREDITS_LIMIT - quota.usedCount);
  const percentage = hasCustomKey ? 0 : Math.min(100, Math.round((quota.usedCount / DAILY_AI_CREDITS_LIMIT) * 100));

  // Time until midnight reset
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const msToMidnight = midnight.getTime() - now.getTime();
  const hoursLeft = Math.floor(msToMidnight / (1000 * 60 * 60));
  const minsLeft = Math.floor((msToMidnight % (1000 * 60 * 60)) / (1000 * 60));
  const resetTimeStr = `${hoursLeft}h ${minsLeft}m`;

  return {
    used: quota.usedCount,
    total: hasCustomKey ? "∞" : DAILY_AI_CREDITS_LIMIT,
    remaining,
    percentage,
    resetTimeStr,
    isExhausted: hasCustomKey ? false : remaining <= 0,
    isLow: hasCustomKey ? false : (remaining > 0 && remaining <= 5),
    hasCustomKey,
    providerName: info.meta.name,
    providerId: info.provider,
    featureBreakdown: quota.featureBreakdown || {},
    autoSwitchEnabled: isAutoSwitchAIEnabled(),
    candidates: getAIProviderCandidates(info.provider),
  };
}

export function checkCanUseAI(): { allowed: boolean; reason?: string; cooldownMs?: number } {
  const hasCustomKey = hasAnyCustomApiKey();
  const quota = getStoredQuota();
  const now = Date.now();

  // 1. Daily Limit Check (exempt if user provided their own API key for any choice)
  if (!hasCustomKey && quota.usedCount >= DAILY_AI_CREDITS_LIMIT) {
    return {
      allowed: false,
      reason: `Daily free AI limit of ${DAILY_AI_CREDITS_LIMIT} queries reached! Select an AI choice (Google Gemini, Groq, OpenAI, OpenRouter, DeepSeek) and enter your key to continue with unlimited queries immediately.`,
    };
  }

  // 2. Cooldown Check (anti-spam)
  const cooldownLimit = hasCustomKey ? 500 : MIN_COOLDOWN_MS;
  const timeSinceLast = now - (quota.lastRequestTimestamp || 0);
  if (timeSinceLast < cooldownLimit) {
    const waitSeconds = Math.ceil((cooldownLimit - timeSinceLast) / 1000);
    return {
      allowed: false,
      reason: `Please wait ${waitSeconds}s before making another AI request.`,
      cooldownMs: cooldownLimit - timeSinceLast,
    };
  }

  return { allowed: true };
}

export function recordAIUsage(feature: "chat" | "mistake_quiz" | "pdf_scan" | "question_gen" | "error_explain" | string) {
  const quota = getStoredQuota();
  quota.usedCount += 1;
  quota.lastRequestTimestamp = Date.now();
  quota.featureBreakdown[feature] = (quota.featureBreakdown[feature] || 0) + 1;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(quota));
    window.dispatchEvent(new CustomEvent("kolehiyotrack_ai_quota_updated", { detail: quota }));
  } catch (err) {
    console.warn("Failed to persist AI quota update:", err);
  }
}

export function useAIQuota() {
  const [status, setStatus] = useState(getAIQuotaStatus);

  useEffect(() => {
    const handleUpdate = () => {
      setStatus(getAIQuotaStatus());
    };

    window.addEventListener("kolehiyotrack_ai_quota_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("sulyap_ai_key_changed", handleUpdate);
    return () => {
      window.removeEventListener("kolehiyotrack_ai_quota_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("sulyap_ai_key_changed", handleUpdate);
    };
  }, []);

  return status;
}
