import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { User } from "firebase/auth";

export interface BannedStoreData {
  ids: string[];
  hashes: string[];
}

/**
 * Normalizes question text to create a robust content hash that matches even if punctuation or minor spacing changes.
 */
export function normalizeTextHash(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^\w]/g, "") // remove all non-alphanumeric characters
    .trim();
}

const getLocalStoreKey = (uniId: string) => `kolehiyotrack_banned_store_${uniId}`;

/**
 * Fetches the local banned questions (IDs and hashes) from LocalStorage.
 */
export function getLocalBannedStore(uniId: string): BannedStoreData {
  try {
    const raw = localStorage.getItem(getLocalStoreKey(uniId));
    if (!raw) return { ids: [], hashes: [] };
    const parsed = JSON.parse(raw);
    return {
      ids: Array.isArray(parsed.ids) ? parsed.ids : [],
      hashes: Array.isArray(parsed.hashes) ? parsed.hashes : [],
    };
  } catch (err) {
    console.error("[BannedStore] Error reading local store:", err);
    return { ids: [], hashes: [] };
  }
}

/**
 * Saves banned questions (IDs and hashes) to LocalStorage.
 */
export function saveLocalBannedStore(uniId: string, data: BannedStoreData): void {
  try {
    localStorage.setItem(getLocalStoreKey(uniId), JSON.stringify(data));
    // Trigger an update event to notify components
    window.dispatchEvent(new Event("banned_questions_updated"));
  } catch (err) {
    console.error("[BannedStore] Error writing to local store:", err);
  }
}

/**
 * Synchronizes local banned questions with Firestore on login or mount.
 */
export async function syncBannedStoreWithFirestore(uniId: string, user: User | null): Promise<BannedStoreData> {
  const currentUser = user || auth.currentUser;
  const localData = getLocalBannedStore(uniId);
  if (!currentUser) return localData;

  try {
    const docRef = doc(db, "user_sessions", currentUser.uid, "universities", uniId, "banned", "store");
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const remoteData = snap.data() as Partial<BannedStoreData>;
      const remoteIds = Array.isArray(remoteData.ids) ? remoteData.ids : [];
      const remoteHashes = Array.isArray(remoteData.hashes) ? remoteData.hashes : [];

      // Merge local and remote
      const mergedIds = Array.from(new Set([...localData.ids, ...remoteIds]));
      const mergedHashes = Array.from(new Set([...localData.hashes, ...remoteHashes]));

      const mergedData = { ids: mergedIds, hashes: mergedHashes };
      saveLocalBannedStore(uniId, mergedData);

      // If local had unsaved items, push them back to firestore
      if (localData.ids.some(id => !remoteIds.includes(id)) || localData.hashes.some(h => !remoteHashes.includes(h))) {
        await setDoc(docRef, mergedData, { merge: true });
      }
      return mergedData;
    } else {
      // Document does not exist in firestore yet, upload local data
      if (localData.ids.length > 0 || localData.hashes.length > 0) {
        await setDoc(docRef, localData, { merge: true });
      }
      return localData;
    }
  } catch (err) {
    console.warn("[BannedStore] Failed to sync with Firestore, using local data:", err);
    return localData;
  }
}

/**
 * Bans a question by its unique identifier and content hash.
 */
export async function banQuestionStore(uniId: string, questionId: string, text: string, user?: User | null): Promise<void> {
  const localData = getLocalBannedStore(uniId);
  const hash = normalizeTextHash(text);

  if (!localData.ids.includes(questionId)) {
    localData.ids.push(questionId);
  }
  if (hash && !localData.hashes.includes(hash)) {
    localData.hashes.push(hash);
  }

  saveLocalBannedStore(uniId, localData);

  const currentUser = user || auth.currentUser;
  if (currentUser) {
    try {
      const docRef = doc(db, "user_sessions", currentUser.uid, "universities", uniId, "banned", "store");
      await setDoc(docRef, {
        ids: arrayUnion(questionId),
        hashes: hash ? arrayUnion(hash) : [],
      }, { merge: true });
    } catch (err) {
      console.warn("[BannedStore] Firestore ban write failed, saved locally:", err);
    }
  }
}

/**
 * Unbans a question by its unique identifier and content hash.
 */
export async function unbanQuestionStore(uniId: string, questionId: string, text: string, user?: User | null): Promise<void> {
  const localData = getLocalBannedStore(uniId);
  const hash = normalizeTextHash(text);

  localData.ids = localData.ids.filter(id => id !== questionId);
  if (hash) {
    localData.hashes = localData.hashes.filter(h => h !== hash);
  }

  saveLocalBannedStore(uniId, localData);

  const currentUser = user || auth.currentUser;
  if (currentUser) {
    try {
      const docRef = doc(db, "user_sessions", currentUser.uid, "universities", uniId, "banned", "store");
      await setDoc(docRef, {
        ids: arrayRemove(questionId),
        hashes: hash ? arrayRemove(hash) : [],
      }, { merge: true });
    } catch (err) {
      console.warn("[BannedStore] Firestore unban write failed, removed locally:", err);
    }
  }
}

/**
 * Checks if a question is banned either by its unique identifier or its content hash.
 */
export function isQuestionBannedStore(uniId: string, questionId: string, text: string): boolean {
  const localData = getLocalBannedStore(uniId);
  if (localData.ids.includes(questionId)) {
    return true;
  }
  const hash = normalizeTextHash(text);
  if (hash && localData.hashes.includes(hash)) {
    return true;
  }
  return false;
}
