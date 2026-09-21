import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "firebase/auth";

const LOCAL_STORAGE_KEY = "kolehiyotrack_added_universities";
const LOCAL_STORAGE_DATES_KEY = "kolehiyotrack_university_exam_dates";
export const UNIVERSITIES_CHANGED_EVENT = "kolehiyotrack_universities_changed";
export const EXAM_DATES_CHANGED_EVENT = "kolehiyotrack_exam_dates_changed";
const DEFAULT_UNIVERSITIES: string[] = [
  'upcat',
  'ateneo',
  'dlsu',
  'ust',
  'bu'
];

export interface TrackedUniversity {
  id: string;
  name: string;
  shortName: string;
  date: string;
  applyUrl: string;
  description: string;
}

export const TRACKED_UNIVERSITIES: TrackedUniversity[] = [
  {
    id: 'upcat',
    name: 'University of the Philippines - (UPCAT 2028)',
    shortName: 'UPCAT',
    date: 'TBA',
    applyUrl: 'https://upcat2026.up.edu.ph/',
    description: ''
  },
  {
    id: 'ateneo',
    name: 'Ateneo de Manila University - (ACET 2027)',
    shortName: 'ACET',
    date: 'Sept 19 – 27, 2026',
    applyUrl: 'https://ateneo.admissions.ph/',
    description: ''
  },
  {
    id: 'dlsu',
    name: 'De La Salle University - (DCAT 2027)',
    shortName: 'DCAT',
    date: 'Sept 5 – Dec 6, 2026',
    applyUrl: 'https://applyarchershub.dlsu.edu.ph/ApplicationLandingPage/index/DLSU',
    description: ''
  },
  {
    id: 'ust',
    name: 'University of Santo Tomas - (USTET 2027)',
    shortName: 'USTET',
    date: 'Oct 3, 2026 – Jan 31, 2027',
    applyUrl: 'https://ustet.ust.edu.ph/',
    description: ''
  },
  {
    id: 'bu',
    name: 'Bicol University - (BUCET 2027)',
    shortName: 'BUCET',
    date: 'Aug 20 – Dec 6, 2026',
    applyUrl: 'https://ibu.bicol-u.edu.ph/',
    description: ''
  }
];

export function getUniversityBrandColor(id: string): string {
  switch (id) {
    case 'upcat': return 'text-primary';
    case 'ateneo': return 'text-[#003366]';
    case 'dlsu': return 'text-[#00703c]';
    case 'ust': return 'text-amber-500 dark:text-amber-400';
    case 'bu': return 'text-[#009cb8]';
    default: return 'text-primary';
  }
}

export function getLocalAddedUniversities(): string[] {
  const allowedIds = new Set(TRACKED_UNIVERSITIES.map(u => u.id));
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!saved) return DEFAULT_UNIVERSITIES;
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) {
      const valid = parsed.filter(id => allowedIds.has(id));
      if (valid.length !== parsed.length) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(valid.length > 0 ? valid : DEFAULT_UNIVERSITIES));
      }
      return valid.length > 0 ? valid : DEFAULT_UNIVERSITIES;
    }
    return DEFAULT_UNIVERSITIES;
  } catch (err) {
    return DEFAULT_UNIVERSITIES;
  }
}

export function setLocalAddedUniversities(ids: string[]) {
  const allowedIds = new Set(TRACKED_UNIVERSITIES.map(u => u.id));
  const cleanIds = ids.filter(id => allowedIds.has(id));
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleanIds.length > 0 ? cleanIds : DEFAULT_UNIVERSITIES));
    window.dispatchEvent(new Event(UNIVERSITIES_CHANGED_EVENT));
  } catch (err) {
    console.error("Failed to save added universities locally:", err);
  }
}

export async function saveUserAddedUniversities(user: User | null, ids: string[]) {
  const allowedIds = new Set(TRACKED_UNIVERSITIES.map(u => u.id));
  const cleanIds = ids.filter(id => allowedIds.has(id));
  setLocalAddedUniversities(cleanIds);
  if (user) {
    try {
      const profileDocRef = doc(db, "user_sessions", user.uid, "settings", "profile");
      await setDoc(profileDocRef, { addedUniversities: cleanIds.length > 0 ? cleanIds : DEFAULT_UNIVERSITIES, updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.error("Failed to sync added universities to Firestore:", err);
    }
  }
}

// ─── Custom Exam Dates Storage & Sync ─────────────────────────────────────────

export function getLocalExamDates(): Record<string, string> {
  const allowedIds = new Set(TRACKED_UNIVERSITIES.map(u => u.id));
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_DATES_KEY);
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    if (parsed && typeof parsed === "object") {
      const clean: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (allowedIds.has(k) && typeof v === "string") {
          clean[k] = v;
        }
      }
      return clean;
    }
    return {};
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
  ust: { label: "Oct 3, 2026 – Jan 31, 2027", defaultTargetDate: "2026-10-03" },
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

// ─── Calendar Filters Storage & Sync ──────────────────────────────────────────

const LOCAL_STORAGE_FILTERS_KEY = "kolehiyotrack_calendar_filters";
export const CALENDAR_FILTERS_CHANGED_EVENT = "kolehiyotrack_calendar_filters_changed";

export interface CalendarFilters {
  search: string;
  institutionType: string; // 'all' | 'State University' | 'Public' | 'Private' | 'Government Scholarship'
  islandGroup: string; // 'all' | 'Luzon' | 'Visayas' | 'Mindanao'
  region: string; // 'all' | 'NCR' | 'Region III' | 'Region IV-A' | 'Region V' | 'Region VII' | 'Region VIII'
  category: string; // 'all' | 'big4' | 'uaap' | 'ncaa'
  openMonth: string; // 'all' | '1'..'12'
  closeMonth: string; // 'all' | '1'..'12'
}

export const DEFAULT_CALENDAR_FILTERS: CalendarFilters = {
  search: "",
  institutionType: "all",
  islandGroup: "all",
  region: "all",
  category: "all",
  openMonth: "all",
  closeMonth: "all",
};

export function getLocalCalendarFilters(): CalendarFilters {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_FILTERS_KEY);
    if (!saved) return DEFAULT_CALENDAR_FILTERS;
    const parsed = JSON.parse(saved);
    return { ...DEFAULT_CALENDAR_FILTERS, ...parsed };
  } catch (err) {
    return DEFAULT_CALENDAR_FILTERS;
  }
}

export function setLocalCalendarFilters(filters: CalendarFilters) {
  try {
    localStorage.setItem(LOCAL_STORAGE_FILTERS_KEY, JSON.stringify(filters));
    window.dispatchEvent(new Event(CALENDAR_FILTERS_CHANGED_EVENT));
  } catch (err) {
    console.error("Failed to save calendar filters locally:", err);
  }
}

export async function saveUserCalendarFilters(user: User | null, filters: CalendarFilters) {
  setLocalCalendarFilters(filters);
  if (user) {
    try {
      const profileDocRef = doc(db, "user_sessions", user.uid, "settings", "profile");
      await setDoc(profileDocRef, { calendarFilters: filters, updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.error("Failed to sync calendar filters to Firestore:", err);
    }
  }
}

export function subscribeUserCalendarFilters(
  user: User | null,
  onSync: (filters: CalendarFilters) => void
): () => void {
  const initial = getLocalCalendarFilters();
  onSync(initial);

  const handleLocalEvent = () => onSync(getLocalCalendarFilters());
  window.addEventListener(CALENDAR_FILTERS_CHANGED_EVENT, handleLocalEvent);

  if (!user) {
    return () => window.removeEventListener(CALENDAR_FILTERS_CHANGED_EVENT, handleLocalEvent);
  }

  const profileDocRef = doc(db, "user_sessions", user.uid, "settings", "profile");
  const unsubFirestore = onSnapshot(
    profileDocRef,
    (snap) => {
      if (snap.exists() && snap.data()?.calendarFilters && typeof snap.data().calendarFilters === "object") {
        const remoteFilters: CalendarFilters = { ...DEFAULT_CALENDAR_FILTERS, ...snap.data().calendarFilters };
        const localSaved = localStorage.getItem(LOCAL_STORAGE_FILTERS_KEY);
        if (localSaved !== JSON.stringify(remoteFilters)) {
          localStorage.setItem(LOCAL_STORAGE_FILTERS_KEY, JSON.stringify(remoteFilters));
          window.dispatchEvent(new Event(CALENDAR_FILTERS_CHANGED_EVENT));
        }
        onSync(remoteFilters);
      }
    },
    (err) => {
      console.error("[Firestore] Error reading user calendar filters:", err);
      onSync(getLocalCalendarFilters());
    }
  );

  return () => {
    unsubFirestore();
    window.removeEventListener(CALENDAR_FILTERS_CHANGED_EVENT, handleLocalEvent);
  };
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
    const allowedIds = new Set(TRACKED_UNIVERSITIES.map(u => u.id));
    if (snap.exists() && Array.isArray(snap.data()?.addedUniversities)) {
      const rawIds: string[] = snap.data().addedUniversities;
      const remoteIds = rawIds.filter(id => allowedIds.has(id));
      const cleanIds = remoteIds.length > 0 ? remoteIds : DEFAULT_UNIVERSITIES;
      const localSaved = localStorage.getItem(LOCAL_STORAGE_KEY);

      if (localSaved !== JSON.stringify(cleanIds)) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleanIds));
        window.dispatchEvent(new Event(UNIVERSITIES_CHANGED_EVENT));
      }
      onSync(cleanIds);
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
