import { SessionAnswer, Choice, Question } from "@/types/session";
import { DiagramSpec } from "@/types/diagram";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export interface MistakeItem {
  id: string; // unique ID
  questionId: string;
  subject: string;
  topic?: string;
  questionText: string;
  choices?: Choice[];
  correctAnswer: string;
  selectedAnswer: string | null;
  explanation?: string;
  diagram?: DiagramSpec;
  dateMissed: string; // ISO date string
  universityId: string;
  missCount: number; // number of times answered incorrectly
  status: "needs_review" | "practicing" | "mastered";
  lastReviewedAt?: string;
  masteryScore: number; // 0 to 100
  aiConceptSummary?: string;
  notes?: string;
}

const STORAGE_KEY_PREFIX = "kolehiyotrack_mistakes_";

function getStorageKey(universityId: string = "upcat") {
  return `${STORAGE_KEY_PREFIX}${universityId}`;
}

export function getLocalMistakes(universityId: string = "upcat"): MistakeItem[] {
  try {
    const raw = localStorage.getItem(getStorageKey(universityId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Failed to read local mistakes:", err);
    return [];
  }
}

export function saveLocalMistakes(items: MistakeItem[], universityId: string = "upcat"): void {
  try {
    localStorage.setItem(getStorageKey(universityId), JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("kolehiyotrack_mistakes_updated", { detail: { universityId } }));
  } catch (err) {
    console.error("Failed to save local mistakes:", err);
  }
}

/**
 * Strips undefined values for Firestore compatibility
 */
function cleanObject(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (Array.isArray(obj)) return obj.map(cleanObject);
  if (typeof obj === "object" && obj !== null) {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) res[k] = cleanObject(v);
    }
    return res;
  }
  return obj;
}

/**
 * Synchronize mistake diary with Firestore
 */
export async function syncMistakesWithFirestore(uid: string, universityId: string = "upcat"): Promise<MistakeItem[]> {
  try {
    const docRef = doc(db, "user_sessions", uid, "universities", universityId, "mistakes_diary", "data");
    const snap = await getDoc(docRef);
    const localItems = getLocalMistakes(universityId);

    if (snap.exists()) {
      const data = snap.data();
      const remoteItems: MistakeItem[] = data?.items || [];
      
      // Merge remote and local by ID, preferring whichever has the newer lastReviewedAt or dateMissed
      const itemMap = new Map<string, MistakeItem>();
      
      remoteItems.forEach(item => itemMap.set(item.id, item));
      localItems.forEach(item => {
        const existing = itemMap.get(item.id);
        if (!existing) {
          itemMap.set(item.id, item);
        } else {
          // If local has higher missCount or newer review, take local
          const localTime = new Date(item.lastReviewedAt || item.dateMissed).getTime();
          const remoteTime = new Date(existing.lastReviewedAt || existing.dateMissed).getTime();
          if (localTime >= remoteTime) {
            itemMap.set(item.id, {
              ...existing,
              ...item,
              missCount: Math.max(existing.missCount || 1, item.missCount || 1),
            });
          }
        }
      });

      const merged = Array.from(itemMap.values());
      saveLocalMistakes(merged, universityId);

      // Write merged back to Firestore
      await setDoc(docRef, { items: cleanObject(merged), updatedAt: Date.now() }, { merge: true });
      return merged;
    } else {
      // Push local items to remote
      if (localItems.length > 0) {
        await setDoc(docRef, { items: cleanObject(localItems), updatedAt: Date.now() }, { merge: true });
      }
      return localItems;
    }
  } catch (err) {
    console.error("Failed to sync mistakes with Firestore:", err);
    return getLocalMistakes(universityId);
  }
}

/**
 * Automatically catalog mistakes after a test session
 */
export async function recordSessionMistakes(
  answers: SessionAnswer[],
  universityId: string = "upcat",
  uid?: string | null
): Promise<MistakeItem[]> {
  const currentMistakes = getLocalMistakes(universityId);
  const mistakeMap = new Map<string, MistakeItem>(currentMistakes.map((m) => [m.questionId || m.id, m]));
  const now = new Date().toISOString();

  let newlyAddedCount = 0;

  for (const ans of answers) {
    // Only record wrong answers (!isCorrect && !isBlank)
    if (!ans.isCorrect && !ans.isBlank) {
      const qKey = ans.questionId || ans.questionText;
      const existing = mistakeMap.get(qKey);

      if (existing) {
        // Update existing mistake
        mistakeMap.set(qKey, {
          ...existing,
          selectedAnswer: ans.selectedAnswer,
          missCount: (existing.missCount || 1) + 1,
          dateMissed: now,
          status: existing.status === "mastered" ? "practicing" : existing.status,
          masteryScore: Math.max(0, (existing.masteryScore || 0) - 15),
          choices: ans.choices || existing.choices,
          explanation: ans.explanation || existing.explanation,
          diagram: ans.diagram || existing.diagram,
        });
      } else {
        // Create new mistake entry
        const newItem: MistakeItem = {
          id: `m_${ans.questionId || Math.random().toString(36).substring(2, 9)}`,
          questionId: ans.questionId,
          subject: ans.subject,
          questionText: ans.questionText,
          choices: ans.choices,
          correctAnswer: ans.correctAnswer,
          selectedAnswer: ans.selectedAnswer,
          explanation: ans.explanation,
          diagram: ans.diagram,
          dateMissed: now,
          universityId,
          missCount: 1,
          status: "needs_review",
          masteryScore: 0,
        };
        mistakeMap.set(qKey, newItem);
        newlyAddedCount++;
      }
    }
  }

  const updatedList = Array.from(mistakeMap.values());
  saveLocalMistakes(updatedList, universityId);

  if (uid) {
    try {
      const docRef = doc(db, "user_sessions", uid, "universities", universityId, "mistakes_diary", "data");
      await setDoc(docRef, { items: cleanObject(updatedList), updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.error("Failed to save mistakes to Firestore:", err);
    }
  }

  return updatedList;
}

/**
 * Update mastery rating or status of a mistake item
 */
export async function updateMistakeStatus(
  mistakeId: string,
  status: "needs_review" | "practicing" | "mastered",
  universityId: string = "upcat",
  uid?: string | null
): Promise<MistakeItem[]> {
  const current = getLocalMistakes(universityId);
  const updated = current.map((item) => {
    if (item.id === mistakeId || item.questionId === mistakeId) {
      const masteryScore = status === "mastered" ? 100 : status === "practicing" ? 50 : 0;
      return {
        ...item,
        status,
        masteryScore,
        lastReviewedAt: new Date().toISOString(),
      };
    }
    return item;
  });

  saveLocalMistakes(updated, universityId);

  if (uid) {
    try {
      const docRef = doc(db, "user_sessions", uid, "universities", universityId, "mistakes_diary", "data");
      await setDoc(docRef, { items: cleanObject(updated), updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.error("Failed to update mistake status in Firestore:", err);
    }
  }

  return updated;
}

/**
 * Delete a mistake item from the diary
 */
export async function removeMistake(
  mistakeId: string,
  universityId: string = "upcat",
  uid?: string | null
): Promise<MistakeItem[]> {
  const current = getLocalMistakes(universityId);
  const updated = current.filter((item) => item.id !== mistakeId && item.questionId !== mistakeId);

  saveLocalMistakes(updated, universityId);

  if (uid) {
    try {
      const docRef = doc(db, "user_sessions", uid, "universities", universityId, "mistakes_diary", "data");
      await setDoc(docRef, { items: cleanObject(updated), updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.error("Failed to remove mistake from Firestore:", err);
    }
  }

  return updated;
}

/**
 * Clear all mastered mistakes from the diary
 */
export async function clearMasteredMistakes(
  universityId: string = "upcat",
  uid?: string | null
): Promise<MistakeItem[]> {
  const current = getLocalMistakes(universityId);
  const updated = current.filter((item) => item.status !== "mastered");

  saveLocalMistakes(updated, universityId);

  if (uid) {
    try {
      const docRef = doc(db, "user_sessions", uid, "universities", universityId, "mistakes_diary", "data");
      await setDoc(docRef, { items: cleanObject(updated), updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.error("Failed to clear mastered mistakes from Firestore:", err);
    }
  }

  return updated;
}
