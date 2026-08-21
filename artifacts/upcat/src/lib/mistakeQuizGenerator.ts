import { Question } from "@/types/session";
import { MistakeItem } from "./mistakeDiary";
import { getBankQuestions, BankQuestion } from "./questionBank";
import { getStoredGeminiApiKey, getAIHeaders } from "./geminiKey";

export interface TargetedQuizOptions {
  mode: "retake" | "ai_generated";
  count?: number;
  subject?: string;
  universityId?: string;
}

export async function generateTargetedQuiz(
  mistakes: MistakeItem[],
  options: TargetedQuizOptions
): Promise<Question[]> {
  const count = options.count || Math.min(mistakes.length, 10);
  const universityId = options.universityId || "upcat";

  // Filter by subject if specified
  let targetMistakes = options.subject && options.subject !== "all"
    ? mistakes.filter((m) => m.subject === options.subject)
    : mistakes;

  if (targetMistakes.length === 0) {
    targetMistakes = mistakes;
  }

  if (targetMistakes.length === 0) {
    throw new Error("No mistakes found in diary to generate a quiz from.");
  }

  // 1. DIRECT RETAKE MODE
  if (options.mode === "retake") {
    // Take up to count items, prioritize ones that are "needs_review"
    const sorted = [...targetMistakes].sort((a, b) => {
      if (a.status === "needs_review" && b.status !== "needs_review") return -1;
      if (a.status !== "needs_review" && b.status === "needs_review") return 1;
      return (b.missCount || 1) - (a.missCount || 1);
    });

    const chosen = sorted.slice(0, count);

    return chosen.map((m, idx) => ({
      id: m.questionId || `retake_${idx}_${Date.now()}`,
      subject: m.subject,
      topic: m.topic || "Mistake Review",
      text: m.questionText,
      choices: m.choices || [
        { id: "A", text: "Option A" },
        { id: "B", text: "Option B" },
        { id: "C", text: "Option C" },
        { id: "D", text: "Option D" },
      ],
      correctAnswer: m.correctAnswer,
      explanation: m.explanation || "Review your previous answer and rationale.",
      diagram: m.diagram,
    }));
  }

  // 2. AI GENERATED MODE
  try {
    const storedKey = getStoredGeminiApiKey();
    const apiPath = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/gemini/mistake-quiz`;
    const response = await fetch(apiPath, {
      method: "POST",
      headers: getAIHeaders(),
      body: JSON.stringify({
        mistakes: targetMistakes.slice(0, 10).map((m) => ({
          subject: m.subject,
          topic: m.topic,
          questionText: m.questionText,
          explanation: m.explanation,
        })),
        count,
        apiKey: storedKey || undefined,
      }),
    });

    if (response.ok) {
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        if (Array.isArray(data.questions) && data.questions.length > 0) {
          return data.questions;
        }
      } catch {
        // Fallback below
      }
    }
  } catch (err) {
    console.warn("AI generation request failed, falling back to smart bank selection:", err);
  }

  // FALLBACK: Smart bank selection based on missed subjects and topics
  const bank = getBankQuestions(universityId);
  const missedSubjects = Array.from(new Set(targetMistakes.map((m) => m.subject)));
  const missedIds = new Set(targetMistakes.map((m) => m.questionId));

  // Find questions from same subjects not currently in missedIds
  let pool = bank.filter((q) => missedSubjects.includes(q.subject) && !missedIds.has(q.id));
  if (pool.length < count) {
    pool = bank.filter((q) => missedSubjects.includes(q.subject));
  }
  if (pool.length === 0) {
    pool = bank;
  }

  // Shuffle and pick
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, count);

  return selected.map((q) => ({
    id: q.id,
    subject: q.subject,
    topic: q.topic,
    text: q.text,
    choices: q.choices,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
    diagram: q.diagram,
  }));
}
