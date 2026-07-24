import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "firebase/auth";

const LOCAL_STORAGE_KEY = "kolehiyotrack_added_universities";
export const UNIVERSITIES_CHANGED_EVENT = "kolehiyotrack_universities_changed";

export function getLocalAddedUniversities(): string[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (err) {
    return [];
  }
}

export function setLocalAddedUniversities(ids: string[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new Event(UNIVERSITIES_CHANGED_EVENT));
  } catch (err) {
    console.error("Failed to save added universities locally:", err);
  }
}

export async function saveUserAddedUniversities(user: User | null, ids: string[]) {
  setLocalAddedUniversities(ids);
  if (user) {
    try {
      const profileDocRef = doc(db, "user_sessions", user.uid, "settings", "profile");
      await setDoc(profileDocRef, { addedUniversities: ids, updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.error("Failed to sync added universities to Firestore:", err);
    }
  }
}

export function subscribeUserAddedUniversities(
  user: User | null,
  onSync: (ids: string[]) => void
): () => void {
  // Always emit local first
  const initialLocal = getLocalAddedUniversities();
  onSync(initialLocal);

  const handleLocalEvent = () => onSync(getLocalAddedUniversities());
  window.addEventListener(UNIVERSITIES_CHANGED_EVENT, handleLocalEvent);

  if (!user) {
    return () => window.removeEventListener(UNIVERSITIES_CHANGED_EVENT, handleLocalEvent);
  }

  // If user is authenticated, sync with Firestore profile doc
  const profileDocRef = doc(db, "user_sessions", user.uid, "settings", "profile");

  const unsubFirestore = onSnapshot(profileDocRef, (snap) => {
    if (snap.exists() && Array.isArray(snap.data()?.addedUniversities)) {
      const remoteIds: string[] = snap.data().addedUniversities;
      const localSaved = localStorage.getItem(LOCAL_STORAGE_KEY);

      if (localSaved !== JSON.stringify(remoteIds)) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(remoteIds));
        window.dispatchEvent(new Event(UNIVERSITIES_CHANGED_EVENT));
      }
      onSync(remoteIds);
    } else {
      // Remote doesn't exist yet; if local has universities, seed remote document
      const currentLocal = getLocalAddedUniversities();
      if (currentLocal.length > 0) {
        setDoc(profileDocRef, { addedUniversities: currentLocal, updatedAt: Date.now() }, { merge: true }).catch(console.error);
      }
    }
  }, (err) => {
    console.error("[Firestore] Error reading user universities profile:", err);
    onSync(getLocalAddedUniversities());
  });

  return () => {
    unsubFirestore();
    window.removeEventListener(UNIVERSITIES_CHANGED_EVENT, handleLocalEvent);
  };
}
