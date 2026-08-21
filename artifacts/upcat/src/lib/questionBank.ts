export interface BankQuestion {
  id: string;
  subject: string;
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

  if (s.includes("filipino") || s.includes("tagalog") || s.includes("balarila") || s.includes("panitikan")) {
    if (s.includes("reading") || s.includes("basa") || s.includes("comprehension") || t.includes("talata") || t.includes("kwento")) {
      return "reading_filipino";
    }
    return "language_filipino";
  }

  if (s.includes("reading") || s.includes("comprehension") || s.includes("passage") || t.includes("passage:") || t.includes("according to the passage")) {
    return "reading_english";
  }

  if (s.includes("abstract") || s.includes("spatial") || s.includes("mental") || s.includes("figure") || s.includes("pattern") || s.includes("matrix")) {
    return "abstract_reasoning";
  }

  if (s.includes("logical") || s.includes("logic") || s.includes("syllogism") || s.includes("deductive")) {
    return "logical_reasoning";
  }

  if (s.includes("numerical") || s.includes("number series") || s.includes("quantitative")) {
    return "numerical_ability";
  }

  if (s.includes("stat") || s.includes("research") || s.includes("business math") || s.includes("interest")) {
    return "statistics_research";
  }

  if (s.includes("general info") || s.includes("gen info") || s.includes("analogy") || s.includes("analogies") || s.includes("civic") || s.includes("literature") || s.includes("history")) {
    return "general_info";
  }

  if (s.includes("math") || s.includes("algebra") || s.includes("geom") || s.includes("trig") || s.includes("calc") || s.includes("arith")) {
    return "math";
  }

  if (s.includes("sci") || s.includes("bio") || s.includes("chem") || s.includes("phys") || s.includes("earth") || s.includes("geol") || s.includes("astro") || s.includes("eco")) {
    return "science";
  }

  if (s.includes("eng") || s.includes("lang") || s.includes("gram") || s.includes("vocab") || s.includes("profic") || s.includes("verbal") || s.includes("eapp")) {
    return "language_english";
  }

  // Quick fallback check by question content
  if (/\b(alin|ano|sino|saan|kailan|bakit|paano|sumusunod|piliin|salita|pangungusap|talata)\b/i.test(t)) {
    return "language_filipino";
  }
  if (/(\$|\\frac|\\sqrt|\^2|f\(x\)|polynomial|triangle|slope|equation|algebra|geometry)/i.test(t)) {
    return "math";
  }
  if (/(cell|mitosis|dna|velocity|gravity|atom|electron|tectonic|plate|trench|earthquake|stoichiometry|molarity|circuit)/i.test(t)) {
    return "science";
  }

  return "science";
}

const getBankKey = (uniId: string) => `kolehiyotrack_bank_${uniId}`;
const getUsedKey = (uniId: string) => `kolehiyotrack_used_${uniId}`;

export function getBankQuestions(uniId: string): BankQuestion[] {
  try {
    const raw = localStorage.getItem(getBankKey(uniId));
    if (!raw) return [];
    const questions = JSON.parse(raw) as BankQuestion[];
    return questions.map((q) => ({
      ...q,
      subject: normalizeBankSubject(q.subject, q.text),
    }));
  } catch {
    return [];
  }
}

export function getBankUpdatedAt(uniId: string): number { return parseInt(localStorage.getItem(`kolehiyotrack_bank_updated_${uniId}`) || "0", 10) || 0; } 
export function setBankUpdatedAt(uniId: string, timestamp: number): void { localStorage.setItem(`kolehiyotrack_bank_updated_${uniId}`, timestamp.toString()); }

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
  const existing = getBankQuestions(uniId);
  const existingIds = new Set(existing.map((q) => q.id));
  const normalizedIncoming = incoming.map((q) => ({
    ...q,
    subject: normalizeBankSubject(q.subject, q.text),
  }));
  const toAdd = normalizedIncoming.filter((q) => !existingIds.has(q.id));
  saveBankQuestions([...existing, ...toAdd], uniId);
  return { added: toAdd.length, skipped: incoming.length - toAdd.length };
}

export function clearBank(uniId: string): void {
  localStorage.removeItem(getBankKey(uniId));
  localStorage.removeItem(getUsedKey(uniId));
  setBankUpdatedAt(uniId, Date.now());
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

export function pickQuestions(
  subject: string,
  count: number,
  topics: string[],
  uniId: string
): BankQuestion[] {
  const all = getBankQuestions(uniId);
  const used = getUsedIds(uniId);

  const filterFn = (q: BankQuestion) => {
    if (q.subject !== subject) return false;
    if (topics.length > 0 && q.topic && !topics.includes(q.topic)) return false;
    return true;
  };

  const candidates = all.filter(filterFn);
  const unused = candidates.filter((q) => !used.has(q.id));
  const pool = unused.length >= count ? unused : candidates;

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
  const all = getBankQuestions(uniId);
  const filtered = all.filter((q) => q.id !== id);
  saveBankQuestions(filtered, uniId);
}

export function getBankStats(uniId: string, subject?: string): { total: number; unused: number } {
  const all = getBankQuestions(uniId);
  const used = getUsedIds(uniId);
  const filtered = subject ? all.filter((q) => q.subject === subject) : all;
  const unused = filtered.filter((q) => !used.has(q.id)).length;
  return { total: filtered.length, unused };
}
