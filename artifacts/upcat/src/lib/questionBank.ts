export interface BankQuestion {
  id: string;
  subject: string;
  university?: string;
  topic?: string;
  text: string;
  imageUrl?: string;
  passageId?: string;
  choices: { id: string; text: string }[];
  correctAnswer: string;
  explanation: string;
  /** Explicit diagram spec for SVG rendering */
  diagram?: import("@/types/diagram").DiagramSpec;
}

import { banQuestionStore, unbanQuestionStore, getLocalBannedStore, isQuestionBannedStore, clearBannedStore } from "./banned-questions-store";

export function normalizeUniversityId(rawUni?: string): string {
  if (!rawUni) return "upcat";
  const u = rawUni.toLowerCase().trim();
  if (u.includes("acet") || u.includes("ateneo") || u.includes("admu")) return "ateneo";
  if (u.includes("bucet") || u.includes("bicol") || u === "bu") return "bu";
  if (u.includes("ustet") || u.includes("ust") || u.includes("tomas")) return "ust";
  if (u.includes("dcat") || u.includes("dlsu") || u.includes("salle") || u.includes("lasalle")) return "dlsu";
  if (u.includes("upcat") || u.includes("up") || u.includes("diliman")) return "upcat";
  return u;
}

export const VALID_BANK_SUBJECT_IDS = [
  "math",
  "science",
  "language_english",
  "language_filipino",
  "reading_english",
  "reading_filipino",
  "numerical_ability",
  "statistics_research",
  "logical_reasoning",
  "abstract_reasoning",
  "general_info",
];

export function normalizeBankSubject(subject: string, text?: string): string {
  const s = String(subject || "").toLowerCase().trim();
  const t = String(text || "").toLowerCase();

  if (VALID_BANK_SUBJECT_IDS.includes(s)) {
    return s;
  }

  // Filipino language & reading
  if (s.includes("filipino") || s.includes("tagalog") || s.includes("balarila") || s.includes("panitikan") || s.includes("wika")) {
    if (s.includes("reading") || s.includes("basa") || s.includes("comprehension") || t.includes("talata") || t.includes("kwento") || t.includes("ayon sa teksto")) {
      return "reading_filipino";
    }
    return "language_filipino";
  }

  // Reading comprehension (English)
  if (s.includes("reading") || s.includes("comprehension") || s.includes("passage") || t.startsWith("passage:") || t.includes("\npassage:") || t.includes("according to the passage") || t.includes("the author's tone")) {
    return "reading_english";
  }

  // Abstract / Spatial reasoning
  if (s.includes("abstract") || s.includes("spatial") || s.includes("mental") || s.includes("figure") || s.includes("pattern") || s.includes("matrix")) {
    return "abstract_reasoning";
  }

  // Logical reasoning
  if (s.includes("logical") || s.includes("logic") || s.includes("syllogism") || s.includes("deductive") || s.includes("fallacy") || s.includes("premise")) {
    return "logical_reasoning";
  }

  // Numerical ability
  if (s.includes("numerical") || s.includes("number series") || s.includes("quantitative")) {
    return "numerical_ability";
  }

  // Statistics & research
  if (s.includes("stat") || s.includes("research") || s.includes("business math") || s.includes("interest")) {
    return "statistics_research";
  }

  // General information & analogies
  if (s.includes("general info") || s.includes("gen info") || s.includes("analogy") || s.includes("analogies") || s.includes("civic") || s.includes("literature") || s.includes("history")) {
    return "general_info";
  }

  // Mathematics
  if (s.includes("math") || s.includes("algebra") || s.includes("geom") || s.includes("trig") || s.includes("calc") || s.includes("arith")) {
    return "math";
  }

  // Science
  if (s.includes("sci") || s.includes("bio") || s.includes("chem") || s.includes("phys") || s.includes("earth") || s.includes("geol") || s.includes("astro") || s.includes("eco")) {
    return "science";
  }

  // English / Language proficiency / Grammar / Vocabulary
  if (s.includes("eng") || s.includes("lang") || s.includes("gram") || s.includes("vocab") || s.includes("profic") || s.includes("verbal") || s.includes("eapp") || s.includes("correct") || s.includes("sentence") || s.includes("error")) {
    return "language_english";
  }

  // Quick fallback check by question content
  if (/\b(alin|ano|sino|saan|kailan|bakit|paano|sumusunod|piliin|salita|pangungusap|talata|wastong|bantas|panlapi)\b/i.test(t)) {
    return "language_filipino";
  }
  if (/(\$|\\frac|\\sqrt|\^2|f\(x\)|polynomial|triangle|slope|equation|algebra|geometry|hypotenuse|perimeter|area of|matrix)/i.test(t)) {
    return "math";
  }
  if (/(cell|mitosis|meiosis|dna|velocity|gravity|atom|electron|tectonic|plate|trench|earthquake|stoichiometry|molarity|circuit|voltage|photosynthesis|newton)/i.test(t)) {
    return "science";
  }
  if (/(____|no error|underlined|subject-verb|verb|tense|preposition|pronoun|synonym|antonym|which of the following sentences|grammatically correct|choose the correct|meaning of)/i.test(t)) {
    return "language_english";
  }

  return "language_english";
}

const getBankKey = (uniId: string) => `kolehiyotrack_bank_${normalizeUniversityId(uniId)}`;
const getUsedKey = (uniId: string) => `kolehiyotrack_used_${normalizeUniversityId(uniId)}`;

export function getBankQuestions(uniId: string): BankQuestion[] {
  const normId = normalizeUniversityId(uniId);
  try {
    let raw = localStorage.getItem(getBankKey(normId));

    // Also check alias keys and migrate if needed
    const aliases: Record<string, string[]> = {
      ateneo: ["acet", "admu"],
      dlsu: ["dcat"],
      ust: ["ustet"],
      bu: ["bucet"],
      upcat: ["up"],
    };

    const possibleKeys = [
      getBankKey(normId),
      ...(aliases[normId] || []).map((a) => `kolehiyotrack_bank_${a}`),
    ];
    const combinedQuestions: BankQuestion[] = [];
    const seenIds = new Set<string>();

    for (const k of possibleKeys) {
      const itemRaw = localStorage.getItem(k);
      if (itemRaw) {
        try {
          const parsed = JSON.parse(itemRaw) as BankQuestion[];
          for (const q of parsed) {
            if (q && q.id && !seenIds.has(q.id)) {
              seenIds.add(q.id);
              combinedQuestions.push({
                ...q,
                university: normId,
                subject: normalizeBankSubject(q.subject, q.text),
              });
            }
          }
        } catch {}
      }
    }

    // If combined questions were found across keys, ensure the canonical key is saved
    if (combinedQuestions.length > 0) {
      if (!raw || JSON.parse(raw).length < combinedQuestions.length) {
        localStorage.setItem(getBankKey(normId), JSON.stringify(combinedQuestions));
      }
      return combinedQuestions;
    }

    if (!raw) return [];
    const questions = JSON.parse(raw) as BankQuestion[];
    return questions.map((q) => ({
      ...q,
      university: normId,
      subject: normalizeBankSubject(q.subject, q.text),
    }));
  } catch {
    return [];
  }
}

export function getBankUpdatedAt(uniId: string): number {
  const normId = normalizeUniversityId(uniId);
  return parseInt(localStorage.getItem(`kolehiyotrack_bank_updated_${normId}`) || "0", 10) || 0;
}
export function setBankUpdatedAt(uniId: string, timestamp: number): void {
  const normId = normalizeUniversityId(uniId);
  localStorage.setItem(`kolehiyotrack_bank_updated_${normId}`, timestamp.toString());
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("question_bank_updated"));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZATION & SIMILARITY COMPARISON
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalizes question text for robust deduplication:
 * - Removes passage header wrappers if present
 * - Strips punctuation while preserving words and numbers without gluing
 * - Collapses whitespace and lowercases
 */
export function normalizeQuestionText(text: string): string {
  if (!text) return "";
  return String(text)
    .toLowerCase()
    .replace(/^passage:\s*[\s\S]*?\n\nquestion:\s*/i, "")
    .replace(/[^\p{L}\p{N}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getWordTokens(text: string): string[] {
  const norm = normalizeQuestionText(text);
  if (!norm) return [];
  return norm.split(" ").filter((w) => w.length > 0);
}

export function calculateSimilarity(text1: string, text2: string): number {
  const norm1 = normalizeQuestionText(text1);
  const norm2 = normalizeQuestionText(text2);
  
  if (norm1 && norm2 && norm1 === norm2) return 1;
  if (!norm1 || !norm2) return 0;

  // Substring containment for substantial questions
  if (norm1.length > 25 && norm2.length > 25) {
    if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.95;
  }

  const tokens1 = getWordTokens(text1);
  const tokens2 = getWordTokens(text2);
  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  let intersectionCount = 0;
  for (const w of set1) {
    if (set2.has(w)) {
      intersectionCount++;
    }
  }

  const unionSize = new Set([...tokens1, ...tokens2]).size;
  if (unionSize === 0) return 0;

  return intersectionCount / unionSize;
}

/**
 * Checks if question q is an exact or near-identical duplicate of target.
 * Rephrased or synonymous questions are allowed for study.
 */
export function isDuplicateQuestion(
  q: { id?: string; text: string },
  target: { id?: string; text: string }
): boolean {
  if (q.id && target.id && q.id === target.id) {
    return true;
  }

  const normQ = normalizeQuestionText(q.text);
  const normTarget = normalizeQuestionText(target.text);

  if (normQ && normTarget && normQ === normTarget) {
    return true;
  }

  // Allow rephrased or synonymous questions: only flag near-identical matches (90%+ identical tokens or direct substring inclusion)
  const sim = calculateSimilarity(q.text, target.text);
  if (sim >= 0.90) {
    return true;
  }

  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// PREVIOUS QUIZ / PAST SESSIONS QUESTION MEMORY
// (A question is ONLY considered repeated if it has appeared in a previous quiz/past session)
// ─────────────────────────────────────────────────────────────────────────────

const getPastQuizKey = (uniId: string) => `kolehiyotrack_past_quiz_q_${normalizeUniversityId(uniId)}`;
const getLocalSessionsKey = (uniId: string) => `kolehiyotrack_sessions_${normalizeUniversityId(uniId)}`;

export interface PastQuizQuestion {
  id: string;
  text: string;
  subject?: string;
  topic?: string;
  choices?: { id: string; text: string }[];
  correctAnswer?: string;
  explanation?: string;
  diagram?: any;
  timestamp: number;
}

export function getPastQuizQuestions(uniId: string): PastQuizQuestion[] {
  try {
    const normUni = normalizeUniversityId(uniId);
    const raw = localStorage.getItem(getPastQuizKey(normUni));
    if (raw) return JSON.parse(raw) as PastQuizQuestion[];
    // Fallback to legacy key if exists
    const legacy = localStorage.getItem(`kolehiyotrack_history_q_${normUni}`);
    if (legacy) return JSON.parse(legacy) as PastQuizQuestion[];
    return [];
  } catch {
    return [];
  }
}

export function recordPastQuizQuestions(
  questions: {
    id?: string;
    text: string;
    subject?: string;
    topic?: string;
    choices?: { id: string; text: string }[];
    correctAnswer?: string;
    explanation?: string;
    diagram?: any;
  }[],
  uniId: string
): void {
  try {
    if (!questions || questions.length === 0) return;
    const normUni = normalizeUniversityId(uniId);
    const existing = getPastQuizQuestions(normUni);
    const existingNorms = new Set(existing.map((e) => normalizeQuestionText(e.text)));
    const existingIds = new Set(existing.map((e) => e.id));
    const now = Date.now();
    let updated = false;

    for (const q of questions) {
      if (!q.text) continue;
      const norm = normalizeQuestionText(q.text);
      if (!norm) continue;
      if (!existingNorms.has(norm) && (!q.id || !existingIds.has(q.id))) {
        existingNorms.add(norm);
        if (q.id) existingIds.add(q.id);
        existing.push({
          id: q.id || `past_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          text: q.text,
          subject: q.subject,
          topic: q.topic,
          choices: q.choices,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          diagram: q.diagram,
          timestamp: now,
        });
        updated = true;
      }
    }

    if (updated) {
      // Keep up to 3000 questions from past quizzes per university
      const capped = existing.slice(-3000);
      localStorage.setItem(getPastQuizKey(normUni), JSON.stringify(capped));
      setBankUpdatedAt(normUni, Date.now());
    }
  } catch (err) {
    console.error("Failed to record past quiz questions:", err);
  }
}

export function removePastQuizQuestion(idOrText: string, uniId: string): void {
  try {
    const normUni = normalizeUniversityId(uniId);
    const existing = getPastQuizQuestions(normUni);
    const filtered = existing.filter((p) => {
      if (p.id === idOrText) return false;
      const norm1 = normalizeQuestionText(p.text);
      const norm2 = normalizeQuestionText(idOrText);
      if (norm1 && norm2 && (norm1 === norm2 || calculateSimilarity(p.text, idOrText) >= 0.90)) {
        return false;
      }
      return true;
    });
    localStorage.setItem(getPastQuizKey(normUni), JSON.stringify(filtered));
    setBankUpdatedAt(normUni, Date.now());
  } catch (err) {
    console.error("Failed to remove past quiz question:", err);
  }
}

export function isQuestionInPastQuizzes(
  q: { id?: string; text: string },
  uniId: string
): boolean {
  const normUni = normalizeUniversityId(uniId);
  const pastList = getPastQuizQuestions(normUni);
  for (const past of pastList) {
    if (isDuplicateQuestion(q, past)) {
      return true;
    }
  }
  return false;
}

export function getQuizzedRepeatBannedQuestions(uniId: string): PastQuizQuestion[] {
  const normUni = normalizeUniversityId(uniId);
  const pastList = getPastQuizQuestions(normUni);
  const bank = getBankQuestions(normUni);

  return pastList.map((p) => {
    const match = bank.find((b) => isDuplicateQuestion(b, p));
    return {
      ...p,
      choices: p.choices && p.choices.length > 0 ? p.choices : match?.choices,
      correctAnswer: p.correctAnswer || match?.correctAnswer,
      explanation: p.explanation || match?.explanation,
      subject: p.subject || match?.subject || "general",
      topic: p.topic || match?.topic,
    };
  });
}

export function clearPastQuizQuestions(uniId: string): void {
  const normUni = normalizeUniversityId(uniId);
  localStorage.removeItem(getPastQuizKey(normUni));
  localStorage.removeItem(`kolehiyotrack_history_q_${normUni}`);
  setBankUpdatedAt(normUni, Date.now());
}

// Backward compatibility aliases
export type HistoricalQuestion = PastQuizQuestion;
export const getHistoricalQuestions = getPastQuizQuestions;
export const recordHistoricalQuestions = recordPastQuizQuestions;
export const clearHistoricalQuestions = clearPastQuizQuestions;

export function getLocalSessions(uniId: string): any[] {
  try {
    const raw = localStorage.getItem(getLocalSessionsKey(uniId));
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveLocalSession(uniId: string, session: any): void {
  try {
    const existing = getLocalSessions(uniId);
    const filtered = existing.filter((s: any) => s.id !== session.id);
    const updated = [session, ...filtered].slice(0, 100);
    localStorage.setItem(getLocalSessionsKey(uniId), JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to save local session:", err);
  }
}

export function saveBankQuestions(questions: BankQuestion[], uniId: string, skipTimestampUpdate = false): void {
  const normalized = questions.map((q) => ({
    ...q,
    subject: normalizeBankSubject(q.subject, q.text),
  }));
  localStorage.setItem(getBankKey(uniId), JSON.stringify(normalized));
  if (!skipTimestampUpdate) {
    setBankUpdatedAt(uniId, Date.now());
  }
}

export function addBankQuestions(incoming: BankQuestion[], uniId: string): { added: number; skipped: number } {
  // Save to the active university context unless explicit
  const targetUni = normalizeUniversityId(uniId || "upcat");
  const existing = getBankQuestions(targetUni);
  const existingMap = new Map(existing.map((q) => [q.id, q]));

  const normalizedIncoming = incoming.map((q) => ({
    ...q,
    university: targetUni,
    subject: normalizeBankSubject(q.subject, q.text),
  }));

  const toAdd: BankQuestion[] = [];
  const seenBatchTexts = new Set<string>();
  const seenBatchIds = new Set<string>();
  let skipped = 0;

  for (let i = 0; i < normalizedIncoming.length; i++) {
    const q = normalizedIncoming[i];
    const normText = normalizeQuestionText(q.text);

    // Prevent duplicate entries inside the exact same pasted batch
    if (normText && seenBatchTexts.has(normText)) {
      skipped++;
      continue;
    }
    if (q.id && seenBatchIds.has(q.id)) {
      q.id = `${q.id}_${i}`;
    }

    if (normText) seenBatchTexts.add(normText);
    if (q.id) seenBatchIds.add(q.id);

    // If already exists in bank with identical ID or identical text, update/replace it
    const existingIndex = existing.findIndex((ex) => ex.id === q.id || (normText && normalizeQuestionText(ex.text) === normText));
    if (existingIndex >= 0) {
      existing[existingIndex] = q;
    } else {
      toAdd.push(q);
    }
  }

  saveBankQuestions([...existing, ...toAdd], targetUni);
  return { added: normalizedIncoming.length - skipped, skipped };
}

/**
 * Universal robust parser for Question Bank text and JSON imports.
 * Accurately parses:
 * 1. Standard question blocks (Math, Science, Language, etc.)
 * 2. Reading Comprehension (One PASSAGE followed by multiple IDs/questions)
 * 3. Diagrams in DIAGRAM: { ... } line or multi-line JSON
 * 4. Multi-line KaTeX formulas and explanations
 * 5. Works whether blocks are separated by `---`, `===`, `UNIVERSITY:`, `ID:`, or blank lines.
 */
export function parseRawQuestionBankText(
  rawText: string,
  fallbackUniId: string = "upcat",
  defaultSubject?: string
): BankQuestion[] | null {
  if (!rawText || !rawText.trim()) return null;

  const trimmed = rawText.trim();

  // 1. Try JSON Array first (or JSON wrapped in markdown fences)
  const jsonMatch = trimmed.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/) || (trimmed.startsWith("[") && trimmed.endsWith("]") ? [null, trimmed] : null);
  if (jsonMatch && jsonMatch[1]) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const valid: BankQuestion[] = [];
        for (let i = 0; i < parsed.length; i++) {
          const item = parsed[i];
          if (!item || typeof item !== "object") continue;
          const choices = Array.isArray(item.choices)
            ? item.choices.map((c: any) => ({
                id: String(c.id || "").toUpperCase(),
                text: String(c.text || "").trim(),
              })).filter((c: any) => c.id && c.text)
            : [];
          if (choices.length !== 4) continue;

          const qText = item.text || item.question || "";
          const subj = normalizeBankSubject(item.subject || defaultSubject || "", qText);
          const itemUni = normalizeUniversityId(item.university || fallbackUniId);
          const q: BankQuestion = {
            id: item.id || `q_${itemUni}_${subj}_${Date.now()}_${i}_${Math.floor(Math.random() * 1000)}`,
            subject: subj,
            university: itemUni,
            topic: item.topic || undefined,
            text: qText,
            imageUrl: item.imageUrl,
            passageId: item.passageId,
            choices,
            correctAnswer: (item.correctAnswer || choices[0]?.id || "A").toUpperCase(),
            explanation: item.explanation || "",
          };
          if (item.diagram) q.diagram = item.diagram;
          valid.push(q);
        }
        if (valid.length > 0) return valid;
      }
    } catch {
      // Continue to plain text parser
    }
  }

  // 2. Parse Plain Text Format
  // Clean markdown fences if any
  const cleanedText = trimmed
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/\r\n/g, "\n");

  const lines = cleanedText.split("\n");

  const questions: BankQuestion[] = [];
  let currentPassageText = "";
  let currentPassageIdNum = 0;

  interface IntermediateItem {
    id: string;
    university: string;
    subject: string;
    topic: string;
    hasOwnPassage: boolean;
    passage: string;
    question: string;
    choices: { id: string; text: string }[];
    correctAnswer: string;
    explanationLines: string[];
    diagramLines: string[];
  }

  const createEmptyItem = (): IntermediateItem => ({
    id: "",
    university: fallbackUniId,
    subject: defaultSubject || "",
    topic: "",
    hasOwnPassage: false,
    passage: "",
    question: "",
    choices: [],
    correctAnswer: "",
    explanationLines: [],
    diagramLines: [],
  });

  let currentItem = createEmptyItem();
  let activeField: "none" | "passage" | "question" | "explanation" | "diagram" = "none";

  const finalizeCurrentItem = () => {
    // Only finalize if we have exactly 4 choices and some text
    if (currentItem.choices.length === 4) {
      const activePassage = currentItem.hasOwnPassage ? currentItem.passage : currentPassageText;
      let text = "";
      if (activePassage && currentItem.question) {
        text = `PASSAGE:\n${activePassage}\n\nQUESTION: ${currentItem.question}`;
      } else if (activePassage) {
        text = `PASSAGE:\n${activePassage}`;
      } else if (currentItem.question) {
        text = currentItem.question;
      }

      let passageId: string | undefined = undefined;
      if (activePassage) {
        passageId = `p${currentPassageIdNum || 1}`;
      }

      let diagram: any = undefined;
      if (currentItem.diagramLines.length > 0) {
        try {
          const rawDiag = currentItem.diagramLines.join("\n").trim();
          diagram = JSON.parse(rawDiag);
        } catch {
          // Ignore invalid diagram JSON
        }
      }

      const qSubject = normalizeBankSubject(currentItem.subject || defaultSubject || "", text);
      const qUni = normalizeUniversityId(currentItem.university || fallbackUniId);
      const qId = currentItem.id && currentItem.id !== "q_unique_id_here"
        ? currentItem.id
        : `q_${qUni}_${qSubject}_${Date.now()}_${questions.length + 1}_${Math.floor(Math.random() * 1000)}`;

      questions.push({
        id: qId,
        subject: qSubject,
        university: qUni,
        topic: currentItem.topic || undefined,
        text,
        passageId,
        choices: currentItem.choices,
        correctAnswer: (currentItem.correctAnswer || currentItem.choices[0]?.id || "A").toUpperCase(),
        explanation: currentItem.explanationLines.join("\n").trim(),
        ...(diagram ? { diagram } : {}),
      });
    }

    // Reset current item (preserving subject & active passage)
    const prevSubj = currentItem.subject;
    const prevUni = currentItem.university;
    currentItem = createEmptyItem();
    currentItem.subject = prevSubj;
    currentItem.university = prevUni;
    activeField = "none";
  };

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const rawLine = lines[lineIdx];
    const line = rawLine.trim();

    // Check for explicit separator lines
    if (/^(\-{3,}|\={3,}|\_{3,})$/.test(line)) {
      finalizeCurrentItem();
      continue;
    }

    // Tag matching (case-insensitive)
    const upper = line.toUpperCase();

    // UNIVERSITY: Tag
    if (/^UNIVERSITY\s*:/i.test(line)) {
      if (currentItem.question || currentItem.choices.length > 0) {
        finalizeCurrentItem();
      }
      currentItem.university = line.replace(/^UNIVERSITY\s*:/i, "").trim() || fallbackUniId;
      activeField = "none";
      continue;
    }

    // PASSAGE: Tag
    if (/^PASSAGE\s*:/i.test(line)) {
      if (currentItem.question || currentItem.choices.length > 0) {
        finalizeCurrentItem();
      }
      currentPassageIdNum++;
      const rest = line.replace(/^PASSAGE\s*:/i, "").trim();
      currentPassageText = rest ? rest : "";
      currentItem.hasOwnPassage = true;
      currentItem.passage = currentPassageText;
      activeField = "passage";
      continue;
    }

    // ID: Tag
    if (/^ID\s*:/i.test(line)) {
      // If current item already has question or choices, ID: indicates a new question item!
      if (currentItem.question || currentItem.choices.length > 0) {
        finalizeCurrentItem();
      }
      currentItem.id = line.replace(/^ID\s*:/i, "").trim();
      activeField = "none";
      continue;
    }

    // SUBJECT: Tag
    if (/^SUBJECT\s*:/i.test(line)) {
      currentItem.subject = line.replace(/^SUBJECT\s*:/i, "").trim();
      activeField = "none";
      continue;
    }

    // TOPIC: Tag
    if (/^TOPIC\s*:/i.test(line)) {
      currentItem.topic = line.replace(/^TOPIC\s*:/i, "").trim();
      activeField = "none";
      continue;
    }

    // QUESTION: Tag
    if (/^QUESTION\s*:/i.test(line)) {
      // If current item already has choices or a question, this starts a new item
      if (currentItem.choices.length > 0) {
        finalizeCurrentItem();
      }
      const qText = line.replace(/^QUESTION\s*:/i, "").trim();
      currentItem.question = qText;
      activeField = "question";
      continue;
    }

    // Choice Tag: A) Choice, A. Choice, or A: Choice
    const choiceMatch = line.match(/^([A-D])[\)\.\:]\s*(.*)$/i);
    if (choiceMatch) {
      activeField = "none";
      const letter = choiceMatch[1].toUpperCase();
      const choiceText = choiceMatch[2].trim();
      // Replace existing choice if same letter, or push
      const existingIdx = currentItem.choices.findIndex((c) => c.id === letter);
      if (existingIdx >= 0) {
        currentItem.choices[existingIdx] = { id: letter, text: choiceText };
      } else {
        currentItem.choices.push({ id: letter, text: choiceText });
      }
      continue;
    }

    // CORRECT: or CORRECT ANSWER: Tag
    if (/^CORRECT(?:\s*ANSWER)?\s*:/i.test(line)) {
      activeField = "none";
      const ans = line.replace(/^CORRECT(?:\s*ANSWER)?\s*:/i, "").trim();
      const match = ans.match(/^[A-D]/i);
      currentItem.correctAnswer = match ? match[0].toUpperCase() : ans.slice(0, 1).toUpperCase();
      continue;
    }

    // EXPLANATION: Tag
    if (/^EXPLANATION\s*:/i.test(line)) {
      const expText = line.replace(/^EXPLANATION\s*:/i, "").trim();
      currentItem.explanationLines = expText ? [expText] : [];
      activeField = "explanation";
      continue;
    }

    // DIAGRAM: Tag
    if (/^DIAGRAM\s*:/i.test(line)) {
      const diagText = line.replace(/^DIAGRAM\s*:/i, "").trim();
      currentItem.diagramLines = diagText ? [diagText] : [];
      activeField = "diagram";
      continue;
    }

    // If we're inside a multi-line field, append
    if (activeField === "passage") {
      if (line) {
        currentPassageText = currentPassageText ? `${currentPassageText}\n${line}` : line;
        currentItem.passage = currentPassageText;
      } else if (currentPassageText) {
        currentPassageText += "\n";
        currentItem.passage = currentPassageText;
      }
      continue;
    }

    if (activeField === "question") {
      if (line) {
        currentItem.question = currentItem.question ? `${currentItem.question}\n${line}` : line;
      }
      continue;
    }

    if (activeField === "explanation") {
      if (line) {
        currentItem.explanationLines.push(line);
      }
      continue;
    }

    if (activeField === "diagram") {
      if (line) {
        currentItem.diagramLines.push(line);
      }
      continue;
    }
  }

  // Finalize last item
  finalizeCurrentItem();

  return questions.length > 0 ? questions : null;
}

export function clearBank(uniId: string): void {
  const normId = normalizeUniversityId(uniId);
  localStorage.removeItem(getBankKey(normId));
  localStorage.removeItem(getUsedKey(normId));
  setBankUpdatedAt(normId, Date.now());
}

export function getUsedIds(uniId: string): Set<string> {
  try {
    const raw = localStorage.getItem(getUsedKey(uniId));
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export function saveUsedIds(ids: string[], uniId: string): void {
  localStorage.setItem(getUsedKey(uniId), JSON.stringify(ids));
}

export function markQuestionsUsed(ids: string[], uniId: string): void {
  const used = getUsedIds(uniId);
  ids.forEach((id) => used.add(id));
  saveUsedIds([...used], uniId);
  setBankUpdatedAt(uniId, Date.now());
}

export function resetUsedIds(uniId: string): void {
  localStorage.removeItem(getUsedKey(uniId));
  setBankUpdatedAt(uniId, Date.now());
}

export function getPassageId(q: BankQuestion): string | null {
  if (q.passageId) {
    return q.passageId;
  }
  if (q.subject && q.subject.startsWith("reading_") && q.text && q.text.startsWith("PASSAGE:")) {
    const match = q.text.match(/^PASSAGE:\s*\n?([\s\S]*?)\n?\nQUESTION:/i);
    if (match) {
      const passageHash = match[1].trim().slice(0, 100);
      return passageHash;
    }
  }
  return null;
}

const getBannedKey = (uniId: string) => `kolehiyotrack_banned_${uniId}`;

export function getBannedIds(uniId: string): Set<string> {
  const store = getLocalBannedStore(uniId);
  return new Set(store.ids);
}

export function banQuestion(id: string, uniId: string, text?: string): void {
  // Try to find the question text if not provided
  let qText = text || "";
  if (!qText) {
    const q = getBankQuestions(uniId).find((item) => item.id === id);
    if (q) qText = q.text;
  }
  banQuestionStore(uniId, id, qText);
  setBankUpdatedAt(uniId, Date.now());
}

export function unbanQuestion(id: string, uniId: string, text?: string): void {
  let qText = text || "";
  if (!qText) {
    const q = getBankQuestions(uniId).find((item) => item.id === id);
    if (q) qText = q.text;
  }
  unbanQuestionStore(uniId, id, qText);
  setBankUpdatedAt(uniId, Date.now());
}

export function resetBannedQuestions(uniId: string): void {
  clearBannedStore(uniId);
  setBankUpdatedAt(uniId, Date.now());
}

export function unbanAllQuestions(uniId: string): void {
  const normId = normalizeUniversityId(uniId);
  resetBannedQuestions(normId);
  clearPastQuizQuestions(normId);
  resetUsedIds(normId);
  setBankUpdatedAt(normId, Date.now());
}

export function clearPastQuizHistory(uniId: string): void {
  try {
    const normId = normalizeUniversityId(uniId);
    localStorage.removeItem(getLocalSessionsKey(normId));
    localStorage.removeItem(getPastQuizKey(normId));
    localStorage.removeItem(`kolehiyotrack_history_q_${normId}`);
    localStorage.removeItem(getUsedKey(normId));
    resetBannedQuestions(normId);
    setBankUpdatedAt(normId, Date.now());
  } catch (err) {
    console.error("Failed to clear past quiz history:", err);
  }
}

export function getBannedQuestions(uniId: string): BankQuestion[] {
  const all = getBankQuestions(uniId);
  return all.filter((q) => isQuestionBannedStore(uniId, q.id, q.text));
}

export function pickQuestions(
  subject: string,
  count: number,
  topics: string[],
  uniId: string
): BankQuestion[] {
  const normId = normalizeUniversityId(uniId);
  const all = getBankQuestions(normId);
  const used = getUsedIds(normId);

  const filterFn = (q: BankQuestion) => {
    if (q.subject !== subject) return false;
    if (topics.length > 0 && q.topic && !topics.includes(q.topic)) return false;
    
    // Check manual ban store
    if (isQuestionBannedStore(normId, q.id, q.text)) return false;
    return true;
  };

  const allowRepeated = typeof window !== "undefined" && localStorage.getItem("kt-allow-repeated") === "true";
  const candidates = all.filter(filterFn);
  // Repeat ban: only ban questions that have appeared in past sessions / quizzes or used in current rotation
  const unused = candidates.filter((q) => !used.has(q.id) && (allowRepeated || !isQuestionInPastQuizzes(q, normId)));
  const pool = allowRepeated ? (unused.length >= count ? unused : candidates) : unused;

  // For reading comprehension, keep passages grouped together
  if (subject.startsWith("reading_")) {
    // Group by passage
    const passageGroups: Record<string, BankQuestion[]> = {};
    const standalone: BankQuestion[] = [];
    for (const q of pool) {
      const pid = getPassageId(q);
      if (pid) {
        if (!passageGroups[pid]) passageGroups[pid] = [];
        passageGroups[pid].push(q);
      } else {
        standalone.push(q);
      }
    }

    // Shuffle passage groups
    const groupKeys = Object.keys(passageGroups).sort(() => Math.random() - 0.5);
    let result: BankQuestion[] = [];
    for (const key of groupKeys) {
      const group = passageGroups[key];
      // If adding this whole group would exceed count by too much, skip
      if (result.length + group.length > count && result.length > 0) {
        continue;
      }
      result = result.concat(group);
    }

    // Add standalone questions if needed to reach count
    const shuffledStandalone = [...standalone].sort(() => Math.random() - 0.5);
    while (result.length < count && shuffledStandalone.length > 0) {
      const q = shuffledStandalone.pop()!;
      if (!result.some((r) => r.id === q.id)) {
        result.push(q);
      }
    }
    return result;
  }

  // For other subjects, just shuffle and pick
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function deleteBankQuestion(id: string, uniId: string): void {
  const normId = normalizeUniversityId(uniId);
  const all = getBankQuestions(normId);
  const q = all.find((item) => item.id === id);
  const filtered = all.filter((item) => item.id !== id);
  saveBankQuestions(filtered, normId);
  // Also clean up from banned lists if deleted from bank
  unbanQuestion(id, normId, q?.text);
}

export function getBankStats(uniId: string, subject?: string): { total: number; unused: number } {
  const normId = normalizeUniversityId(uniId);
  const all = getBankQuestions(normId);
  const used = getUsedIds(normId);

  const filtered = subject ? all.filter((q) => q.subject === subject) : all;

  // Available questions in bank (not manually blocked)
  const available = filtered.filter((q) => !isQuestionBannedStore(normId, q.id, q.text));

  const allowRepeated = typeof window !== "undefined" && localStorage.getItem("kt-allow-repeated") === "true";
  const unused = available.filter((q) => !used.has(q.id) && (allowRepeated || !isQuestionInPastQuizzes(q, normId))).length;
  return { total: available.length, unused };
}
