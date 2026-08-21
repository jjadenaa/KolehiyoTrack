import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "firebase/auth";

const LOCAL_STORAGE_KEY = "kolehiyotrack_added_universities";
const LOCAL_STORAGE_DATES_KEY = "kolehiyotrack_university_exam_dates";
export const UNIVERSITIES_CHANGED_EVENT = "kolehiyotrack_universities_changed";
export const EXAM_DATES_CHANGED_EVENT = "kolehiyotrack_exam_dates_changed";
const DEFAULT_UNIVERSITIES: string[] = [];

export function getLocalAddedUniversities(): string[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!saved) return DEFAULT_UNIVERSITIES;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : DEFAULT_UNIVERSITIES;
  } catch (err) {
    return DEFAULT_UNIVERSITIES;
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

// ─── Custom Exam Dates Storage & Sync ─────────────────────────────────────────

export function getLocalExamDates(): Record<string, string> {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_DATES_KEY);
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    return {};
  }
}

export function setLocalExamDates(dates: Record<string, string>) {
  try {
    localStorage.setItem(LOCAL_STORAGE_DATES_KEY, JSON.stringify(dates));
    window.dispatchEvent(new Event(EXAM_DATES_CHANGED_EVENT));
  } catch (err) {
    console.error("Failed to save exam dates locally:", err);
  }
}

export async function saveUserExamDates(user: User | null, dates: Record<string, string>) {
  setLocalExamDates(dates);
  if (user) {
    try {
      const profileDocRef = doc(db, "user_sessions", user.uid, "settings", "profile");
      await setDoc(profileDocRef, { examDates: dates, updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.error("Failed to sync exam dates to Firestore:", err);
    }
  }
}

export async function saveSingleExamDate(user: User | null, uniId: string, dateStr: string) {
  const current = getLocalExamDates();
  const updated = { ...current };
  if (!dateStr || dateStr.trim() === "") {
    delete updated[uniId];
  } else {
    updated[uniId] = dateStr.trim();
  }
  await saveUserExamDates(user, updated);
}

export const DEFAULT_UNIVERSITY_EXAM_DATES: Record<string, { label: string; defaultTargetDate?: string }> = {
  upcat: { label: "TBA" },
  ateneo: { label: "Sept 19 – 27, 2026", defaultTargetDate: "2026-09-19" },
  dlsu: { label: "Sept 5 – Dec 6, 2026", defaultTargetDate: "2026-09-05" },
  bu: { label: "Aug 20 – Dec 6, 2026", defaultTargetDate: "2026-08-20" },
};

export function calculateDaysRemaining(dateInput?: string, uniId?: string): number | null {
  const dateStr = dateInput || (uniId ? DEFAULT_UNIVERSITY_EXAM_DATES[uniId]?.defaultTargetDate : undefined);
  if (!dateStr || dateStr.trim() === "" || dateStr === "TBA") return null;
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return null;

  // Set target to end of that day in local time
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 23, 59, 59);
  const now = new Date();
  const diffMs = targetDay.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function formatCustomDateDisplay(dateInput?: string, uniId?: string): string {
  if (!dateInput || dateInput.trim() === "" || dateInput === "TBA") {
    if (uniId && DEFAULT_UNIVERSITY_EXAM_DATES[uniId]) {
      return DEFAULT_UNIVERSITY_EXAM_DATES[uniId].label;
    }
    return "TBA";
  }
  const target = new Date(dateInput);
  if (isNaN(target.getTime())) return dateInput;

  return target.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Subscriptions ───────────────────────────────────────────────────────────

export function subscribeUserExamDates(
  user: User | null,
  onSync: (dates: Record<string, string>) => void
): () => void {
  const initial = getLocalExamDates();
  onSync(initial);

  const handleLocalEvent = () => onSync(getLocalExamDates());
  window.addEventListener(EXAM_DATES_CHANGED_EVENT, handleLocalEvent);

  if (!user) {
    setLocalExamDates({});
    onSync({});
    return () => window.removeEventListener(EXAM_DATES_CHANGED_EVENT, handleLocalEvent);
  }

  const profileDocRef = doc(db, "user_sessions", user.uid, "settings", "profile");
  const unsubFirestore = onSnapshot(
    profileDocRef,
    (snap) => {
      if (snap.exists() && snap.data()?.examDates && typeof snap.data().examDates === "object") {
        const remoteDates: Record<string, string> = snap.data().examDates;
        const localSaved = localStorage.getItem(LOCAL_STORAGE_DATES_KEY);
        if (localSaved !== JSON.stringify(remoteDates)) {
          localStorage.setItem(LOCAL_STORAGE_DATES_KEY, JSON.stringify(remoteDates));
          window.dispatchEvent(new Event(EXAM_DATES_CHANGED_EVENT));
        }
        onSync(remoteDates);
      } else {
        const currentLocal = getLocalExamDates();
        if (Object.keys(currentLocal).length > 0) {
          setDoc(profileDocRef, { examDates: currentLocal, updatedAt: Date.now() }, { merge: true }).catch(console.error);
        }
      }
    },
    (err) => {
      console.error("[Firestore] Error reading user exam dates:", err);
      onSync(getLocalExamDates());
    }
  );

  return () => {
    unsubFirestore();
    window.removeEventListener(EXAM_DATES_CHANGED_EVENT, handleLocalEvent);
  };
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
    setLocalAddedUniversities([]);
    onSync([]);
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
      // Remote profile doc does not exist yet for this account; initialize with DEFAULT_UNIVERSITIES
      setDoc(profileDocRef, { addedUniversities: DEFAULT_UNIVERSITIES, updatedAt: Date.now() }, { merge: true }).catch(console.error);
      setLocalAddedUniversities(DEFAULT_UNIVERSITIES);
      onSync(DEFAULT_UNIVERSITIES);
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
