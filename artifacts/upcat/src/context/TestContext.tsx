import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback, ReactNode } from "react";
import { Question, SessionAnswer, Session } from "@/types/session";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
  doc,
  collection,
  query,
  orderBy,
  onSnapshot,
  setDoc,
  deleteDoc,
  Timestamp
} from "firebase/firestore";
import {
  getBankQuestions,
  saveBankQuestions,
  getBankUpdatedAt,
  setBankUpdatedAt,
  getUsedIds,
  saveUsedIds,
  BankQuestion
} from "@/lib/questionBank";

interface TestContextType {
  universityId: string;
  setUniversityId: (id: string) => void;
  questions: Question[];
  answers: Record<string, SessionAnswer>;
  timeRemaining: number;
  status: "idle" | "ready" | "running" | "finished";
  setQuestions: (questions: Question[]) => void;
  setAnswers: (answers: Record<string, SessionAnswer>) => void;
  setTimeRemaining: (time: number) => void;
  setStatus: (status: "idle" | "ready" | "running" | "finished") => void;
  lastSession: Session | null;
  setLastSession: (session: Session | null) => void;
  resetTest: () => void;
  pastSessions: Session[];
  setPastSessions: (sessions: Session[]) => void;
  sessionsLoaded: boolean;
  bankTrigger: number;
}

const TestContext = createContext<TestContextType | undefined>(undefined);

export function TestProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [universityId, setUniversityId] = useState<string>("upcat");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, SessionAnswer>>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [status, setStatus] = useState<"idle" | "ready" | "running" | "finished">("idle");
  const [lastSession, setLastSession] = useState<Session | null>(null);
  
  // Real-time states
  const [pastSessions, setPastSessions] = useState<Session[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState<boolean>(false);
  const [bankTrigger, setBankTrigger] = useState<number>(0);

  // Generate a random device identifier to identify this browser/tab session and avoid infinite write loops
  const deviceId = useMemo(() => Math.random().toString(36).substring(2, 15), []);
  
  // Refs to avoid infinite write/receive snapshot loops
  const lastActiveQuizSyncRef = useRef<number>(0);
  const internalStateChangeRef = useRef<boolean>(false);

  const resetTest = useCallback(() => {
    setQuestions([]);
    setAnswers({});
    setTimeRemaining(0);
    setStatus("idle");
  }, []);

  // 1. REAL-TIME QUESTION BANK LISTENER
  useEffect(() => {
    if (!user || !universityId) return;

    const bankDocRef = doc(db, "user_sessions", user.uid, "universities", universityId, "quizzes", "questionbank");
    
    const unsub = onSnapshot(bankDocRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      
      // Parse remote updatedAt
      let remoteTime = 0;
      if (data.updatedAt != null) {
        if (typeof data.updatedAt === "number") {
          remoteTime = data.updatedAt;
        } else if (typeof data.updatedAt.toMillis === "function") {
          remoteTime = data.updatedAt.toMillis();
        }
      }

      const localTime = getBankUpdatedAt(universityId);

      // If remote timestamp is newer (or local storage is empty), pull and overwrite local state
      const hasLocalBank = localStorage.getItem(`kolehiyotrack_bank_${universityId}`) !== null;
      if (remoteTime > localTime || !hasLocalBank) {
        console.log(`[Realtime Bank] Remote is newer (${remoteTime} > ${localTime}). Overwriting local question bank.`);
        const remoteQuestions = (data.questions ?? []) as BankQuestion[];
        const remoteUsedIds = (data.usedIds ?? []) as string[];

        // Save to localStorage
        saveBankQuestions(remoteQuestions, universityId, true);
        saveUsedIds(remoteUsedIds, universityId);
        setBankUpdatedAt(universityId, remoteTime);

        // Increment trigger to notify components (e.g. university dashboard stats)
        setBankTrigger((prev) => prev + 1);
      }
    }, (err) => {
      console.error("[Realtime Bank] Error listening to question bank updates:", err);
    });

    return () => unsub();
  }, [user, universityId]);

  // 2. REAL-TIME PAST SESSIONS LISTENER
  useEffect(() => {
    if (!user || !universityId) {
      setPastSessions([]);
      setSessionsLoaded(true);
      return;
    }

    setSessionsLoaded(false);
    const sessionsColRef = collection(db, "user_sessions", user.uid, "universities", universityId, "quizzes");
    const q = query(sessionsColRef, orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, (snapshot) => {
      const loadedSessions: Session[] = [];
      snapshot.docs.forEach((d) => {
        // Skip the "questionbank" doc which is stored in the same subcollection
        if (d.id === "questionbank") return;

        const raw = d.data();
        
        // Skip active quiz document if saved in same collection structure
        if (raw.status !== undefined && raw.questions !== undefined) return;

        const createdAt =
          raw.createdAt instanceof Timestamp
            ? raw.createdAt.toDate().toISOString()
            : typeof raw.createdAt === "string"
            ? raw.createdAt
            : new Date().toISOString();

        const answersList: SessionAnswer[] = raw.answers ?? [];
        const correctCount = raw.correctCount ?? answersList.filter((a) => a.isCorrect).length;
        const wrongCount = raw.wrongCount ?? answersList.filter((a) => !a.isCorrect && !a.isBlank).length;
        const blankCount = raw.blankCount ?? answersList.filter((a) => a.isBlank).length;

        loadedSessions.push({
          id: d.id,
          answers: answersList,
          totalScore: raw.totalScore ?? 0,
          correctCount,
          wrongCount,
          blankCount,
          totalQuestions: raw.totalQuestions ?? 0,
          timeTakenSeconds: raw.timeTakenSeconds ?? 0,
          createdAt,
        } as Session);
      });

      setPastSessions(loadedSessions);
      setSessionsLoaded(true);
    }, (error) => {
      console.error("[Realtime Sessions] Error listening to past sessions:", error);
      setSessionsLoaded(true);
    });

    return () => unsub();
  }, [user, universityId]);

  // Keep track of current status for the snapshot listener without adding it to dependencies
  const statusRef = useRef(status);
  useEffect(() => { statusRef.current = status; }, [status]);

  // 3. REAL-TIME ACTIVE QUIZ PROGRESS LISTENER (REMOTE TO LOCAL)
  useEffect(() => {
    if (!user || !universityId) return;

    const activeQuizDocRef = doc(db, "user_sessions", user.uid, "universities", universityId, "active_quiz", "current");

    const unsub = onSnapshot(activeQuizDocRef, (snap) => {
      if (!snap.exists()) {
        // If doc is deleted, but we are running, let's see if we should reset to idle (meaning finished or aborted elsewhere)
        // Only trigger if we aren't the one who initiated/reset the test locally
        if (statusRef.current !== "idle" && statusRef.current !== "finished" && !internalStateChangeRef.current) {
          console.log("[Realtime Active Quiz] Remote active quiz was deleted. Setting local status to idle.");
          resetTest();
        }
        return;
      }

      const data = snap.data();
      if (data.updatedBy === deviceId) {
        // This update came from this device, ignore to avoid loop
        return;
      }

      const remoteTime = data.lastUpdated ?? 0;
      if (remoteTime <= lastActiveQuizSyncRef.current) {
        // Older or equal timestamp, ignore
        return;
      }

      console.log("[Realtime Active Quiz] Applying remote progress update...");
      lastActiveQuizSyncRef.current = remoteTime;

      // Wrap state updates to prevent triggering immediate write-backs
      internalStateChangeRef.current = true;
      if (data.questions) setQuestions(data.questions);
      if (data.answers) setAnswers(data.answers);
      if (data.timeRemaining !== undefined) setTimeRemaining(data.timeRemaining);
      if (data.status) setStatus(data.status);
      
      // Release flag shortly after updates flush
      setTimeout(() => {
        internalStateChangeRef.current = false;
      }, 100);
    }, (error) => {
      console.error("[Realtime Active Quiz] Error listening to active quiz doc:", error);
    });

    return () => unsub();
  }, [user, universityId, deviceId, resetTest]);

  // 4. WRITE LOCAL ACTIVE QUIZ CHANGES TO FIRESTORE
  const syncActiveQuizToFirestore = useCallback(async (
    s: "idle" | "ready" | "running" | "finished",
    q: Question[],
    a: Record<string, SessionAnswer>,
    t: number
  ) => {
    if (!user || !universityId) return;

    const docRef = doc(db, "user_sessions", user.uid, "universities", universityId, "active_quiz", "current");

    if (s === "idle" || s === "finished") {
      // Clear document from Firestore
      try {
        await deleteDoc(docRef);
      } catch (err) {
        console.error("[Active Quiz Sync] Error clearing active quiz:", err);
      }
      return;
    }

    const now = Date.now();
    lastActiveQuizSyncRef.current = now;

    try {
      await setDoc(docRef, {
        status: s,
        questions: q,
        answers: a,
        timeRemaining: t,
        lastUpdated: now,
        updatedBy: deviceId,
      });
    } catch (err) {
      console.error("[Active Quiz Sync] Error saving active quiz state:", err);
    }
  }, [user, universityId, deviceId]);

  // Sync state changes immediately (questions, answers, status)
  useEffect(() => {
    if (!user || !universityId) return;
    if (internalStateChangeRef.current) return; // Skip if we just pulled this from remote

    syncActiveQuizToFirestore(status, questions, answers, timeRemaining);
  }, [status, questions, answers, user, universityId, syncActiveQuizToFirestore]);

  // Debounced/Throttled Sync for timeRemaining to avoid heavy writes (runs during 'running' state)
  const lastTimeSyncedRef = useRef<number>(0);
  useEffect(() => {
    if (!user || !universityId || status !== "running") return;
    if (internalStateChangeRef.current) return;

    const diff = Math.abs(lastTimeSyncedRef.current - timeRemaining);
    if (diff >= 10) {
      syncActiveQuizToFirestore(status, questions, answers, timeRemaining);
      lastTimeSyncedRef.current = timeRemaining;
    }
  }, [timeRemaining, status, questions, answers, user, universityId, syncActiveQuizToFirestore]);

  return (
    <TestContext.Provider
      value={{
        universityId,
        setUniversityId,
        questions,
        answers,
        timeRemaining,
        status,
        setQuestions,
        setAnswers,
        setTimeRemaining,
        setStatus,
        lastSession,
        setLastSession,
        resetTest,
        pastSessions,
        setPastSessions,
        sessionsLoaded,
        bankTrigger,
      }}
    >
      {children}
    </TestContext.Provider>
  );
}

export function useTest() {
  const context = useContext(TestContext);
  if (context === undefined) {
    throw new Error("useTest must be used within a TestProvider");
  }
  return context;
}
