import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BankQuestion, getBankQuestions, saveBankQuestions, getBankUpdatedAt, getUsedIds, saveUsedIds } from "@/lib/questionBank";

function bankRef(uid: string, universityId: string) {
  return doc(db, "user_sessions", uid, "universities", universityId, "quizzes", "questionbank");
}

/** Recursively strip all undefined values from an object. Firestore rejects undefined. */
function stripUndefined(obj: unknown): unknown {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  if (typeof obj === "object" && obj !== null) {
    const clean: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val !== undefined) clean[key] = stripUndefined(val);
    }
    return clean;
  }
  return obj;
}

function cleanQuestions(questions: BankQuestion[]): unknown[] {
  return questions.map((q) => {
    const base: Record<string, unknown> = {
      id: q.id,
      subject: q.subject,
      text: q.text,
      choices: q.choices,
      correctAnswer: q.correctAnswer,
    };
    if (q.topic) base.topic = q.topic;
    if (q.explanation) base.explanation = q.explanation;
    if (q.passageId) base.passageId = q.passageId;
    if (q.imageUrl) base.imageUrl = q.imageUrl;
    if (q.diagram) base.diagram = q.diagram;
    return stripUndefined(base);
  });
}

export async function uploadBankToFirestore(uid: string, universityId: string): Promise<void> {
  try {
    const questions = getBankQuestions(universityId);
    const localTime = getBankUpdatedAt(universityId);
    const usedIds = Array.from(getUsedIds(universityId));
    await setDoc(bankRef(uid, universityId), {
      questions: cleanQuestions(questions),
      usedIds,
      updatedAt: localTime,
    });
  } catch (err) {
    console.error("[uploadBankToFirestore] Failed to upload question bank:", err);
    throw err;
  }
}

export async function downloadBankFromFirestoreFull(uid: string, universityId: string): Promise<{ questions: BankQuestion[], usedIds: string[], updatedAt: number }> {
  try {
    const snap = await getDoc(bankRef(uid, universityId));
    if (!snap.exists()) return { questions: [], usedIds: [], updatedAt: 0 };
    const data = snap.data();
    let updatedAt = 0;
    if (data?.updatedAt != null) {
      if (typeof data.updatedAt === 'number') {
        updatedAt = data.updatedAt;
      } else if (typeof data.updatedAt.toMillis === 'function') {
        updatedAt = data.updatedAt.toMillis();
      }
    }
    return {
      questions: (data?.questions ?? []) as BankQuestion[],
      usedIds: (data?.usedIds ?? []) as string[],
      updatedAt
    };
  } catch (err) {
    console.error("[downloadBankFromFirestoreFull] Failed to download question bank:", err);
    throw err;
  }
}

export async function downloadBankFromFirestore(uid: string, universityId: string): Promise<BankQuestion[]> {
  const { questions } = await downloadBankFromFirestoreFull(uid, universityId);
  return questions;
}

export async function syncBankWithFirestore(uid: string, universityId: string): Promise<{ merged: number }> {
  try {
    const { questions: remote, usedIds: remoteUsedIds, updatedAt: remoteTime } = await downloadBankFromFirestoreFull(uid, universityId);
    
    const local = getBankQuestions(universityId);
    const localTime = getBankUpdatedAt(universityId);
    const localUsedIds = Array.from(getUsedIds(universityId));

    if (remoteTime > localTime) {
      // Remote is newer, pull changes (completely replace local)
      saveBankQuestions(remote, universityId, true); // skip timestamp update so we don't accidentally make local "newer" without real edits
      saveUsedIds(remoteUsedIds, universityId);
      
      // We still need to calculate if anything was "merged" for UI feedback, 
      // but in reality we just replaced it.
      return { merged: remote.length };
    } else if (localTime > remoteTime) {
      // Local is newer, push changes
      await setDoc(bankRef(uid, universityId), {
        questions: cleanQuestions(local),
        usedIds: localUsedIds,
        updatedAt: localTime,
      });
      return { merged: 0 };
    }
    
    return { merged: 0 };
  } catch (err) {
    console.error("[syncBankWithFirestore] Failed to sync question bank:", err);
    throw err;
  }
}

