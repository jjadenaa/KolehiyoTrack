import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { User } from "firebase/auth";
import { 
  AIProvider, 
  getActiveAIProvider, 
  setActiveAIProvider, 
  getStoredApiKeyForProvider, 
  saveStoredApiKeyForProvider,
  getStoredGroqModel,
  saveStoredGroqModel,
  getStoredCloudflareAccountId,
  saveStoredCloudflareAccountId,
  isAutoSwitchAIEnabled,
  setAutoSwitchAIEnabled
} from "./geminiKey";

export interface UserAISettingsDoc {
  activeProvider: AIProvider;
  keys: Partial<Record<AIProvider, string>>;
  groqModel?: string;
  cloudflareAccountId?: string;
  autoSwitchEnabled?: boolean;
  updatedAt?: any;
}

export const AI_SETTINGS_SYNC_EVENT = "sulyap_ai_settings_synced";

/**
 * Returns current snapshot of local AI settings
 */
export function getCurrentLocalAISettings(): UserAISettingsDoc {
  const providers: AIProvider[] = ["gemini", "groq", "cohere", "cloudflare"];
  const keys: Partial<Record<AIProvider, string>> = {};

  for (const p of providers) {
    const k = getStoredApiKeyForProvider(p);
    if (k) keys[p] = k;
  }

  return {
    activeProvider: getActiveAIProvider(),
    keys,
    groqModel: getStoredGroqModel(),
    cloudflareAccountId: getStoredCloudflareAccountId(),
    autoSwitchEnabled: isAutoSwitchAIEnabled(),
  };
}

/**
 * Saves AI settings to Firestore for the authenticated user.
 * Silently catches errors if offline or unauthenticated.
 */
export async function saveUserAISettingsToAccount(
  user: User | null,
  patch?: Partial<{
    activeProvider?: AIProvider;
    providerKey?: { provider: AIProvider; key: string };
    groqModel?: string;
    cloudflareAccountId?: string;
    autoSwitchEnabled?: boolean;
  }>
): Promise<void> {
  const currentUser = user || auth.currentUser;
  if (!currentUser) return;

  try {
    const docRef = doc(db, "user_sessions", currentUser.uid, "settings", "ai_settings");
    const currentLocal = getCurrentLocalAISettings();

    const keysToSave = { ...currentLocal.keys };
    if (patch?.providerKey) {
      if (patch.providerKey.key && patch.providerKey.key.trim()) {
        keysToSave[patch.providerKey.provider] = patch.providerKey.key.trim();
      } else {
        delete keysToSave[patch.providerKey.provider];
      }
    }

    const payload: Record<string, any> = {
      activeProvider: patch?.activeProvider || currentLocal.activeProvider,
      keys: keysToSave,
      groqModel: patch?.groqModel !== undefined ? patch.groqModel : currentLocal.groqModel,
      cloudflareAccountId: patch?.cloudflareAccountId !== undefined ? patch.cloudflareAccountId : currentLocal.cloudflareAccountId,
      autoSwitchEnabled: patch?.autoSwitchEnabled !== undefined ? patch.autoSwitchEnabled : currentLocal.autoSwitchEnabled,
      updatedAt: serverTimestamp(),
    };

    await setDoc(docRef, payload, { merge: true });
    window.dispatchEvent(new CustomEvent(AI_SETTINGS_SYNC_EVENT, { detail: { synced: true, userEmail: currentUser.email } }));
  } catch (err) {
    console.warn("[userAISettings] Could not sync AI settings to Firestore account:", err);
  }
}

/**
 * Synchronizes account settings into local storage when a user logs in.
 * Merges local keys with account keys so neither is lost.
 */
export async function syncUserAISettingsOnLogin(user: User): Promise<void> {
  if (!user) return;

  try {
    const docRef = doc(db, "user_sessions", user.uid, "settings", "ai_settings");
    const snap = await getDoc(docRef);

    const local = getCurrentLocalAISettings();
    const providers: AIProvider[] = ["gemini", "groq", "cohere", "cloudflare"];

    if (snap.exists()) {
      const data = snap.data() as Partial<UserAISettingsDoc>;
      const remoteKeys = data.keys || {};
      let needsUploadMerge = false;

      // 1. Apply remote keys to local storage if present
      for (const p of providers) {
        const remoteK = remoteKeys[p];
        const localK = local.keys[p];

        if (remoteK && remoteK.trim()) {
          saveStoredApiKeyForProvider(p, remoteK.trim());
        } else if (localK && localK.trim()) {
          // Local has a key that remote doesn't have yet -> mark for merge upload
          needsUploadMerge = true;
        }
      }

      // 2. Apply remote provider
      if (data.activeProvider) {
        setActiveAIProvider(data.activeProvider);
      }

      // 3. Apply Groq model
      if (data.groqModel) {
        saveStoredGroqModel(data.groqModel);
      }

      // 4. Apply Cloudflare Account ID
      if (data.cloudflareAccountId) {
        saveStoredCloudflareAccountId(data.cloudflareAccountId);
      }

      // 5. Apply auto-switch
      if (typeof data.autoSwitchEnabled === "boolean") {
        setAutoSwitchAIEnabled(data.autoSwitchEnabled);
      }

      // If local had unsaved keys, push the merged set to the account
      if (needsUploadMerge) {
        await saveUserAISettingsToAccount(user);
      }
    } else {
      // First time user on account: if they have any local keys configured, upload them now!
      const hasAnyLocal = Object.keys(local.keys).length > 0 || Boolean(local.cloudflareAccountId);
      if (hasAnyLocal) {
        await saveUserAISettingsToAccount(user);
      }
    }

    window.dispatchEvent(new Event("sulyap_ai_key_changed"));
    window.dispatchEvent(new CustomEvent(AI_SETTINGS_SYNC_EVENT, { detail: { synced: true, userEmail: user.email } }));
  } catch (err) {
    console.warn("[userAISettings] Failed to sync account settings on login:", err);
  }
}

/**
 * Subscribes to real-time updates for AI settings in Firestore.
 */
export function subscribeUserAISettings(
  user: User | null,
  onUpdate?: (settings: UserAISettingsDoc) => void
): () => void {
  if (!user) return () => {};

  try {
    const docRef = doc(db, "user_sessions", user.uid, "settings", "ai_settings");
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<UserAISettingsDoc>;
          const providers: AIProvider[] = ["gemini", "groq", "cohere", "cloudflare"];

          if (data.keys) {
            for (const p of providers) {
              const remoteVal = data.keys[p];
              if (remoteVal !== undefined) {
                saveStoredApiKeyForProvider(p, remoteVal || "");
              }
            }
          }

          if (data.activeProvider) {
            setActiveAIProvider(data.activeProvider);
          }

          if (data.groqModel) {
            saveStoredGroqModel(data.groqModel);
          }

          if (data.cloudflareAccountId) {
            saveStoredCloudflareAccountId(data.cloudflareAccountId);
          }

          if (typeof data.autoSwitchEnabled === "boolean") {
            setAutoSwitchAIEnabled(data.autoSwitchEnabled);
          }

          const current = getCurrentLocalAISettings();
          onUpdate?.(current);
          window.dispatchEvent(new Event("sulyap_ai_key_changed"));
          window.dispatchEvent(new CustomEvent(AI_SETTINGS_SYNC_EVENT, { detail: { synced: true, userEmail: user.email } }));
        }
      },
      (err) => {
        console.warn("[userAISettings] Snapshot listener warning:", err);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn("[userAISettings] Failed to establish listener:", err);
    return () => {};
  }
}
