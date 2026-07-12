import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BankQuestion, getBankQuestions, saveBankQuestions } from "@/lib/questionBank";

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
    await setDoc(bankRef(uid, universityId), {
      questions: cleanQuestions(questions),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("[uploadBankToFirestore] Failed to upload question bank:", err);
    throw err;
  }
}

export async function downloadBankFromFirestore(uid: string, universityId: string): Promise<BankQuestion[]> {
  try {
    const snap = await getDoc(bankRef(uid, universityId));
    if (!snap.exists()) return [];
    const data = snap.data();
    return (data?.questions ?? []) as BankQuestion[];
  } catch (err) {
    console.error("[downloadBankFromFirestore] Failed to download question bank:", err);
    throw err;
  }
}

export async function syncBankWithFirestore(uid: string, universityId: string): Promise<{ merged: number }> {
  try {
    const remote = await downloadBankFromFirestore(uid, universityId);
    const local = getBankQuestions(universityId);
    const localIds = new Set(local.map((q) => q.id));
    
    const toAdd = remote.filter((q) => !localIds.has(q.id));
    if (toAdd.length === 0) return { merged: 0 };
    
    const merged = [...local, ...toAdd];
    saveBankQuestions(merged, universityId);
    
    await setDoc(bankRef(uid, universityId), {
      questions: cleanQuestions(merged),
      updatedAt: serverTimestamp(),
    });
    
    return { merged: toAdd.length };
  } catch (err) {
    console.error("[syncBankWithFirestore] Failed to sync question bank:", err);
    throw err;
  }
}

