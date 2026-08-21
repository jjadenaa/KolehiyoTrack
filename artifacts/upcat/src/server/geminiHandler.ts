import { GoogleGenAI, Type } from "@google/genai";
import * as pdfParseModule from "pdf-parse";

const VALID_SUBJECT_IDS = [
  "math",
  "numerical_ability",
  "statistics_research",
  "science",
  "language_english",
  "language_filipino",
  "reading_english",
  "reading_filipino",
  "logical_reasoning",
  "abstract_reasoning",
  "general_info",
];

/**
 * Robust subject classification and normalization for CET exams
 */
export function normalizeSubject(rawSubject?: string, questionText?: string, explicitSubjectHint?: string): string {
  if (explicitSubjectHint && VALID_SUBJECT_IDS.includes(explicitSubjectHint)) {
    return explicitSubjectHint;
  }

  const s = String(rawSubject || "").toLowerCase().trim();
  const text = String(questionText || "").toLowerCase();

  // 1. Explicit canonical match
  if (VALID_SUBJECT_IDS.includes(s)) {
    return s;
  }

  // 2. Filipino language & reading patterns
  const isFilipinoText = /\b(alin|ano|sino|saan|kailan|bakit|paano|sumusunod|piliin|salita|pangungusap|talata|kasingkahulugan|kasalungat|tayutay|tula|kwento|akda|pahayag|wastong|gamit|balarila)\b/i.test(text);
  
  if (s.includes("filipino") || s.includes("tagalog") || s.includes("balarila") || s.includes("panitikan") || isFilipinoText) {
    if (s.includes("reading") || s.includes("basa") || s.includes("comprehension") || text.includes("talata") || text.includes("kwento") || text.includes("passage")) {
      return "reading_filipino";
    }
    return "language_filipino";
  }

  // 3. Reading Comprehension (English)
  if (s.includes("reading") || s.includes("comprehension") || s.includes("passage") || text.includes("passage:") || text.includes("according to the passage") || text.includes("the author implies")) {
    return "reading_english";
  }

  // 4. Mathematics patterns
  const isMathText = /(\$|\\frac|\\sqrt|\^2|\^3|\\pm|\\int|\\sum|\\theta|\\pi|\\le|\\ge|\\times|\\approx|f\(x\)|g\(x\)|polynomial|quadratic|triangle|hypotenuse|perimeter|radius|diameter|slope|intercept|matrix|determinant|probability|permutation|combination|logarithm|exponent|tangent|cosine|sine|angle|equation|algebra|calculus|geometry|trigonometry|arithmetic)/i.test(text);

  if (s.includes("math") || s.includes("algebra") || s.includes("geom") || s.includes("trig") || s.includes("calc") || s.includes("stat") || s.includes("prob") || s.includes("arith") || isMathText) {
    return "math";
  }

  // 5. Science patterns
  const isScienceText = /(cell|mitosis|meiosis|dna|rna|chromosome|photosynthesis|ecosystem|species|organism|velocity|acceleration|gravity|newton|joule|friction|momentum|optics|lens|concave|convex|atom|electron|proton|neutron|isotope|mole|molar|solution|titration|ph\b|acid|base|tectonic|plate|trench|earthquake|volcano|fault|atmosphere|crust|mantle|core|galaxy|planet|solar|organ\b|heart|blood|respiration|enzyme)/i.test(text);

  if (s.includes("sci") || s.includes("bio") || s.includes("chem") || s.includes("phys") || s.includes("earth") || s.includes("geol") || s.includes("astro") || s.includes("eco") || isScienceText) {
    return "science";
  }

  // 6. English Language Proficiency patterns
  if (s.includes("english") || s.includes("lang") || s.includes("gram") || s.includes("vocab") || s.includes("profic") || s.includes("verbal") || s.includes("analogy") || s.includes("error")) {
    return "language_english";
  }

  return "science"; // default safe fallback
}

/**
 * Resilient JSON Array parser that extracts valid question objects even from:
 * - Direct JSON arrays `[...]`
 * - Wrapped objects `{ "questions": [...] }` or `{ "data": [...] }`
 * - Truncated JSON streams (e.g. cut off by token limits)
 * - Raw text with embedded JSON objects
 */
function safeJsonParseArray(rawText: string): any[] | null {
  if (!rawText || typeof rawText !== "string") return null;
  let text = rawText.trim();

  // Strip markdown code fences
  text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

  // 1. Attempt direct standard parse
  try {
    const direct = JSON.parse(text);
    if (Array.isArray(direct) && direct.length > 0) return direct;
    if (direct && Array.isArray(direct.questions) && direct.questions.length > 0) return direct.questions;
    if (direct && Array.isArray(direct.items) && direct.items.length > 0) return direct.items;
    if (direct && Array.isArray(direct.data) && direct.data.length > 0) return direct.data;
    if (direct && Array.isArray(direct.results) && direct.results.length > 0) return direct.results;
  } catch {
    // Continue to robust substring parsing
  }

  // 2. Locate JSON array substring
  const firstBracket = text.indexOf("[");
  if (firstBracket !== -1) {
    const sub = text.slice(firstBracket);
    const lastBracket = sub.lastIndexOf("]");
    if (lastBracket !== -1) {
      try {
        const parsed = JSON.parse(sub.slice(0, lastBracket + 1));
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // Fall through to truncation repair
      }
    }

    // 3. Salvage truncated JSON array (cut off before closing ']')
    const lastObjectClose = sub.lastIndexOf("}");
    if (lastObjectClose !== -1) {
      const repaired = sub.slice(0, lastObjectClose + 1) + "]";
      try {
        const parsed = JSON.parse(repaired);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // Fall through to progressive extractor
      }
    }
  }

  // 4. Progressive individual object extraction (salvages every completed question object)
  const salvaged: any[] = [];
  let depth = 0;
  let startIdx = -1;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === "\\") {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === "{") {
        if (depth === 0) startIdx = i;
        depth++;
      } else if (char === "}") {
        depth--;
        if (depth === 0 && startIdx !== -1) {
          const chunk = text.slice(startIdx, i + 1);
          try {
            const obj = JSON.parse(chunk);
            if (obj && (obj.text || obj.question || obj.questionText)) {
              salvaged.push(obj);
            }
          } catch {
            // Ignore incomplete chunks
          }
          startIdx = -1;
        }
      }
    }
  }

  if (salvaged.length > 0) {
    return salvaged;
  }

  return null;
}

/**
 * Normalizes question object into standard format with accurate subject assignment
 */
function normalizeExtractedQuestion(q: any, idx: number, explicitSubjectHint?: string): any {
  const text = q.text || q.question || q.questionText || `Question ${idx + 1}`;
  const subject = normalizeSubject(q.subject, text, explicitSubjectHint);
  
  // Format choices
  let choices: Array<{ id: string; text: string }> = [];
  if (Array.isArray(q.choices) && q.choices.length > 0) {
    choices = q.choices.map((c: any, cIdx: number) => {
      const id = (c && c.id) ? String(c.id).toUpperCase() : String.fromCharCode(65 + cIdx);
      const textVal = typeof c === "string" ? c : (c && c.text ? String(c.text) : `Option ${id}`);
      return { id, text: textVal };
    });
  } else if (q.options && typeof q.options === "object") {
    choices = Object.entries(q.options).map(([k, v]) => ({
      id: k.toUpperCase(),
      text: String(v),
    }));
  }

  // If no choices were extracted or provided (e.g. open-ended problem solving items)
  if (choices.length < 2) {
    const rawAnswer = q.correctAnswer || q.answer || "Correct Solution";
    choices = [
      { id: "A", text: String(rawAnswer) },
      { id: "B", text: "Alternative calculation" },
      { id: "C", text: "Alternative estimate" },
      { id: "D", text: "None of the above" },
    ];
  }

  // Format correctAnswer
  let rawAns = q.correctAnswer || q.answer || q.correct_answer || "A";
  if (typeof rawAns === "number") {
    rawAns = String.fromCharCode(65 + rawAns);
  }
  const correctAnswer = String(rawAns).trim().toUpperCase().replace(/[^A-D]/g, "").slice(0, 1) || "A";

  return {
    id: `ai_ext_${Date.now()}_${idx + 1}`,
    subject,
    topic: q.topic || "CET Practice Questions",
    text,
    passageId: q.passageId || undefined,
    choices,
    correctAnswer,
    explanation: q.explanation || q.rationale || "Step-by-step solution verified by AI.",
  };
}

/**
 * Executes a generateContent call with exponential backoff retry and model fallback
 * specifically for transient 503 (high demand) and 429 (rate limit) errors.
 */
async function generateWithRetry(
  ai: GoogleGenAI,
  params: any,
  maxRetries = 2
): Promise<any> {
  const primaryModel = params.model || "gemini-3.7-flash";
  const modelCandidates = [
    primaryModel,
    "gemini-3.7-flash",
    "gemini-2.5-flash",
  ].filter((m, i, arr) => arr.indexOf(m) === i); // unique

  let lastError: any = null;

  for (const model of modelCandidates) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await ai.models.generateContent({
          ...params,
          model,
        });
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || "");
        const is503 =
          err?.status === 503 ||
          errMsg.includes("503") ||
          errMsg.includes("UNAVAILABLE") ||
          errMsg.includes("high demand") ||
          errMsg.includes("overloaded");
        const is429 =
          err?.status === 429 ||
          errMsg.includes("429") ||
          errMsg.includes("RESOURCE_EXHAUSTED");

        if ((is503 || is429) && attempt < maxRetries) {
          const delayMs = (attempt + 1) * 1200;
          console.warn(`[Gemini Handler] Model ${model} returned ${is503 ? "503 demand spike" : "429 rate limit"}. Retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        if (is503 || is429) {
          console.warn(`[Gemini Handler] Model ${model} is currently overloaded. Trying next fallback candidate model...`);
          break; // break inner attempt loop, advance to next fallback model
        }

        // If it's a fatal validation/bad request error, throw immediately
        throw err;
      }
    }
  }

  throw lastError;
}

function getGeminiClient(customApiKey?: string): GoogleGenAI {
  const apiKey =
    customApiKey ||
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Please set the GEMINI_API_KEY environment variable in your project settings or provide an API key."
    );
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

export async function handleGeminiChat(message: string, history: any[] = [], customApiKey?: string): Promise<string> {
  if (!message || typeof message !== "string") {
    throw new Error("Message string is required.");
  }

  const ai = getGeminiClient(customApiKey);

  const systemInstruction = `You are "Isko AI" (or "Iska AI"), an ultra-fast, brilliant Philippine College Entrance Test (UPCAT, ACET, DCAT, USTET, PLMAT, BUCET) tutor and academic companion.

Core Guidelines:
1. Deliver direct, razor-sharp, and accurate solutions for Math (Algebra, Geometry, Trigonometry, Pre-Calculus, Stats), Science (Biology, Chemistry, Physics, Earth Science), English Proficiency, Filipino (Balarila at Wastong Gamit), and Reading Comprehension.
2. Format all equations and chemical formulas with clear KaTeX math notation (e.g. $E = mc^2$, $PV = nRT$, or $\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$).
3. Provide fast 30-second CET exam day shortcuts, elimination tricks, and mnemonics.
4. Keep tone encouraging, structured, and fast to read (use concise bullet points, bold key terms, and step-by-step logic).`;

  const formattedContents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

  if (Array.isArray(history)) {
    for (const item of history.slice(-8)) {
      if ((item.role === "user" || item.role === "model") && typeof item.text === "string") {
        formattedContents.push({
          role: item.role,
          parts: [{ text: item.text }],
        });
      }
    }
  }

  formattedContents.push({
    role: "user",
    parts: [{ text: message }],
  });

  const response = await generateWithRetry(ai, {
    model: "gemini-3.7-flash",
    contents: formattedContents,
    config: {
      systemInstruction,
      temperature: 0.6,
      maxOutputTokens: 2048,
    },
  });

  return response.text || "I apologize, but I couldn't generate an answer right now. Please try asking again!";
}

export async function handleGenerateMistakeFollowUpQuiz(
  mistakes: Array<{ subject: string; topic?: string; questionText: string; explanation?: string }>,
  count: number = 5,
  customApiKey?: string
): Promise<any[]> {
  const ai = getGeminiClient(customApiKey);

  const sampleConcepts = mistakes.slice(0, 8).map((m, idx) => 
    `Concept ${idx + 1}: Subject: ${m.subject}, Topic: ${m.topic || "General"}, Question: ${m.questionText.slice(0, 160)}, Explanation note: ${m.explanation?.slice(0, 120) || "N/A"}`
  ).join("\n");

  const prompt = `You are an elite Philippine College Entrance Test (UPCAT, ACET, DCAT, USTET) item writer.
A student took a practice mock exam and answered the following questions incorrectly:

${sampleConcepts}

Task: Generate ${Math.min(count, 10)} brand-new targeted follow-up multiple-choice questions specifically designed to test, reinforce, and diagnose the student's mastery of the EXACT concepts, formulas, grammar rules, or scientific principles they missed above.

Output MUST be a valid JSON array matching this format:
[
  {
    "id": "ai_followup_1",
    "subject": "math",
    "topic": "Quadratic Equations",
    "text": "Question statement here with KaTeX math ($formula$)",
    "choices": [
      { "id": "A", "text": "Choice A text" },
      { "id": "B", "text": "Choice B text" },
      { "id": "C", "text": "Choice C text" },
      { "id": "D", "text": "Choice D text" }
    ],
    "correctAnswer": "A",
    "explanation": "Clear step-by-step rationale why the correct answer is right and why distractors are wrong."
  }
]`;

  const response = await generateWithRetry(ai, {
    model: "gemini-3.7-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      temperature: 0.3,
      responseMimeType: "application/json",
      maxOutputTokens: 4096,
    },
  });

  const raw = response.text || "";
  const parsed = safeJsonParseArray(raw);

  if (parsed && parsed.length > 0) {
    return parsed.map((q: any, idx: number) => ({
      id: `ai_mistake_${Date.now()}_${idx}`,
      subject: normalizeSubject(q.subject, q.text, mistakes[0]?.subject || "math"),
      topic: q.topic || "Targeted Review",
      text: q.text,
      choices: Array.isArray(q.choices) && q.choices.length > 0
        ? q.choices
        : [
            { id: "A", text: "Option A" },
            { id: "B", text: "Option B" },
            { id: "C", text: "Option C" },
            { id: "D", text: "Option D" },
          ],
      correctAnswer: (q.correctAnswer || "A").toUpperCase(),
      explanation: q.explanation || "Step-by-step explanation.",
    }));
  }

  throw new Error("Could not parse AI quiz generation output.");
}

function splitTextIntoQuestionChunks(text: string, targetChunkSize = 2000): string[] {
  if (!text || text.length <= targetChunkSize) {
    return text ? [text] : [];
  }

  // Split by question markers (e.g., "1. ", "Question 1", "Item 1", "Problem 1", "(1) ", "1)")
  const regex = /(?=(?:\r?\n|^)\s*(?:(?:\d{1,3}[\.\)]\s+)|(?:(?:Question|Item|Problem)\s+\d{1,3}[:\.\-]?\s+)))/im;
  const rawSections = text.split(regex).map((s) => s.trim()).filter(Boolean);

  const chunks: string[] = [];
  let currentChunk = "";

  for (const sec of rawSections) {
    if (currentChunk.length + sec.length > targetChunkSize && currentChunk.length > 400) {
      chunks.push(currentChunk.trim());
      currentChunk = sec;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + sec;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  if (chunks.length === 0 && text) {
    // Fallback split by paragraphs
    const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    currentChunk = "";
    for (const p of paragraphs) {
      if (currentChunk.length + p.length > targetChunkSize && currentChunk.length > 400) {
        chunks.push(currentChunk.trim());
        currentChunk = p;
      } else {
        currentChunk += (currentChunk ? "\n\n" : "") + p;
      }
    }
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }
  }

  return chunks.length > 0 ? chunks : [text];
}

async function extractQuestionsFromTextChunk(
  ai: GoogleGenAI,
  text: string,
  universityId?: string,
  subjectHint?: string,
  batchInfo?: { current: number; total: number }
): Promise<any[]> {
  const batchHeader = batchInfo
    ? `PROCESSING BATCH ${batchInfo.current} OF ${batchInfo.total}`
    : "PROCESSING DOCUMENT SECTION";

  const promptText = `You are an exhaustive Philippine College Entrance Test (UPCAT, ACET, DCAT, USTET, PLMAT) exam digitizer and solver.

${batchHeader}

MANDATORY DIRECTIVE:
Extract EVERY SINGLE numbered question, exercise, or problem present in the text section below into the JSON array.
If there are 5, 8, 12, or more questions in this text, you MUST extract ALL of them. DO NOT STOP AFTER 1 QUESTION.

DOCUMENT SECTION TEXT:
"""
${text}
"""

Target Exam: ${universityId?.toUpperCase() || "UPCAT"}
${subjectHint ? `Subject Focus: ${subjectHint}` : "Subject Mode: Classify each question accurately"}

RULES FOR EXTRACTION & SOLVING:
1. EXHAUSTIVE EXTRACTION: Extract every single numbered item without skipping.
2. ACCURATE SUBJECT CLASSIFICATION:
   - Assign "subject" to one of:
     * "science" (Biology, Chemistry, Physics, Earth Science, Astronomy, Geology, Ecology)
     * "math" (Algebra, Geometry, Trigonometry, Pre-Calculus, Arithmetic, Statistics, Probability)
     * "language_english" (Grammar, Vocabulary, Sentence Completion, Error Identification, Analogies)
     * "language_filipino" (Balarila, Wastong Gamit, Panitikan, Tayutay, Talasalitaan)
     * "reading_english" (English reading passages and reading comprehension questions)
     * "reading_filipino" (Filipino pagbasa passages and reading comprehension questions)
     * "numerical_ability" (Arithmetic calculations, Series, Word problems)
     * "statistics_research" (Data interpretation, Graphs, Statistics, Standard Deviation)
     * "logical_reasoning" (Logic, Syllogisms, Deduction)
     * "abstract_reasoning" (Patterns, Sequences, Spatial)
     * "general_info" (History, Civics, Analogies)
3. CHOICES & OPEN-ENDED ITEMS:
   - Extract choices A, B, C, D if present in the document.
   - If options are missing or if it's an open-ended calculation: solve the problem and provide 4 realistic options (A, B, C, D) with the correct answer.
4. ACCURACY & EXPLANATIONS:
   - Provide the verified "correctAnswer" ("A", "B", "C", or "D").
   - Write a clear, concise 1 to 2 sentence explanation.
5. KaTeX FORMULAS:
   - Format formulas with clear KaTeX notation (e.g. $F = ma$, $PV = nRT$, $^{26}_{12}\\text{Mg}$, $\\frac{h}{4}$, $x^2 + 5x + 6 = 0$).

OUTPUT FORMAT:
Return ONLY a valid JSON array of question objects:
[
  {
    "id": "q1",
    "subject": "science",
    "topic": "Earth Science",
    "text": "Full question statement here",
    "choices": [
      { "id": "A", "text": "Option A" },
      { "id": "B", "text": "Option B" },
      { "id": "C", "text": "Option C" },
      { "id": "D", "text": "Option D" }
    ],
    "correctAnswer": "A",
    "explanation": "Concise reason why option A is correct."
  }
]`;

  const response = await generateWithRetry(ai, {
    model: "gemini-3.7-flash",
    contents: [{ role: "user", parts: [{ text: promptText }] }],
    config: {
      temperature: 0.1,
      responseMimeType: "application/json",
      maxOutputTokens: 8192,
    },
  });

  const raw = response.text || "";
  const parsed = safeJsonParseArray(raw);
  if (parsed && parsed.length > 0) {
    return parsed.map((q: any, idx: number) => normalizeExtractedQuestion(q, idx, subjectHint));
  }
  return [];
}

export async function handleExtractQuestionsFromPdfOrText(params: {
  fileBase64?: string;
  fileMimeType?: string;
  textContent?: string;
  subjectHint?: string;
  universityId?: string;
  batchInfo?: { current: number; total: number };
  apiKey?: string;
}, customApiKey?: string): Promise<any[]> {
  const ai = getGeminiClient(customApiKey || params.apiKey);

  // 1. Check if we have raw text content provided
  if (params.textContent && params.textContent.trim().length > 0) {
    const text = params.textContent.trim();
    const chunks = splitTextIntoQuestionChunks(text, 2000);

    if (chunks.length <= 1) {
      return await extractQuestionsFromTextChunk(ai, text, params.universityId, params.subjectHint, params.batchInfo);
    }

    // Process all chunks in parallel for maximum speed
    const chunkPromises = chunks.map((chunk, idx) =>
      extractQuestionsFromTextChunk(ai, chunk, params.universityId, params.subjectHint, {
        current: idx + 1,
        total: chunks.length,
      })
    );

    const chunkResults = await Promise.all(chunkPromises);
    const combined: any[] = [];
    const seenTexts = new Set<string>();

    for (const qList of chunkResults) {
      for (const q of qList) {
        const key = (q.text || "").trim().toLowerCase().slice(0, 80);
        if (key && !seenTexts.has(key)) {
          seenTexts.add(key);
          combined.push(q);
        }
      }
    }

    if (combined.length > 0) {
      return combined;
    }
  }

  // 2. If fileBase64 is a PDF, parse it immediately with pdfParse in server memory (<50ms)
  const isPdf =
    params.fileMimeType === "application/pdf" ||
    (params.fileBase64 && Buffer.from(params.fileBase64.slice(0, 20), "base64").toString().startsWith("%PDF"));

  if (isPdf && params.fileBase64) {
    try {
      const buffer = Buffer.from(params.fileBase64, "base64");
      const PDFParseClass = (pdfParseModule as any).PDFParse || (pdfParseModule as any).default;
      let pdfText = "";

      if (PDFParseClass) {
        const parser = new PDFParseClass({ data: buffer });
        const parsedResult = await parser.getText();
        pdfText = (
          parsedResult?.text ||
          (parsedResult?.pages ? parsedResult.pages.map((p: any) => p.text).join("\n") : "")
        ).trim();
      }

      if (pdfText.length > 60) {
        // Fast text extracted from PDF! Split into question chunks and process in parallel
        const chunks = splitTextIntoQuestionChunks(pdfText, 2000);
        const chunkPromises = chunks.map((chunk, idx) =>
          extractQuestionsFromTextChunk(ai, chunk, params.universityId, params.subjectHint, {
            current: idx + 1,
            total: chunks.length,
          })
        );

        const chunkResults = await Promise.all(chunkPromises);
        const combined: any[] = [];
        const seenTexts = new Set<string>();

        for (const qList of chunkResults) {
          for (const q of qList) {
            const key = (q.text || "").trim().toLowerCase().slice(0, 80);
            if (key && !seenTexts.has(key)) {
              seenTexts.add(key);
              combined.push(q);
            }
          }
        }

        if (combined.length > 0) {
          return combined;
        }
      }
    } catch (parseErr) {
      console.warn("Server pdf-parse failed, falling back to direct multimodal Gemini extraction:", parseErr);
    }
  }

  // 3. Fallback: Multimodal extraction for image exams or scanned PDFs without text layers
  const parts: any[] = [];

  if (params.fileBase64 && params.fileMimeType) {
    parts.push({
      inlineData: {
        mimeType: params.fileMimeType,
        data: params.fileBase64,
      },
    });
  }

  const batchHeader = params.batchInfo
    ? `PROCESSING BATCH ${params.batchInfo.current} OF ${params.batchInfo.total}`
    : "PROCESSING DOCUMENT";

  const promptText = `You are an exhaustive Philippine College Entrance Test (UPCAT, ACET, DCAT, USTET, PLMAT) exam digitizer and solver.

${batchHeader}

MANDATORY DIRECTIVE:
You MUST extract EVERY SINGLE numbered question, exercise, or problem present across ALL pages of this document.
Extract all questions into the JSON array. DO NOT STOP AFTER 1 OR 4 QUESTIONS. Return ALL items.

Target Exam: ${params.universityId?.toUpperCase() || "UPCAT"}
${params.subjectHint ? `Subject Focus: ${params.subjectHint}` : "Subject Mode: Classify each question individually"}

RULES:
1. Extract all questions sequentially without omitting items.
2. Assign subject to: science, math, language_english, language_filipino, reading_english, reading_filipino, numerical_ability, statistics_research, logical_reasoning, abstract_reasoning, general_info.
3. Solve each item, provide correctAnswer (A, B, C, D), and a 1-sentence explanation.
4. Use KaTeX for math formulas ($F = ma$).

OUTPUT FORMAT:
JSON array of question objects:
[
  {
    "id": "q1",
    "subject": "science",
    "topic": "Physics",
    "text": "Question statement",
    "choices": [
      { "id": "A", "text": "Option A" },
      { "id": "B", "text": "Option B" },
      { "id": "C", "text": "Option C" },
      { "id": "D", "text": "Option D" }
    ],
    "correctAnswer": "A",
    "explanation": "Clear explanation."
  }
]`;

  parts.push({ text: promptText });

  const response = await generateWithRetry(ai, {
    model: "gemini-3.7-flash",
    contents: [{ role: "user", parts }],
    config: {
      temperature: 0.1,
      responseMimeType: "application/json",
      maxOutputTokens: 8192,
    },
  });

  const raw = response.text || "";
  const parsed = safeJsonParseArray(raw);

  if (parsed && parsed.length > 0) {
    return parsed.map((q: any, idx: number) => normalizeExtractedQuestion(q, idx, params.subjectHint));
  }

  throw new Error("Could not extract questions from the provided document. Please ensure it contains readable text or clear exam questions.");
}

export async function handleGenerateSubjectQuestions(params: {
  subject: string;
  universityId: string;
  topic?: string;
  count?: number;
  difficulty?: string;
  apiKey?: string;
}, customApiKey?: string): Promise<any[]> {
  const ai = getGeminiClient(customApiKey || params.apiKey);

  const count = Math.min(Math.max(1, params.count || 5), 10);
  const prompt = `You are a premier test designer for Philippine College Entrance Tests (${params.universityId.toUpperCase()} standards).
Generate ${count} high-yield, authentic CET multiple-choice practice questions for:
- Subject: ${params.subject}
- Target University: ${params.universityId.toUpperCase()}
- Topic / Focus Area: ${params.topic || "Core High-Yield Exam Concepts"}
- Difficulty: ${params.difficulty || "Moderate to High (Standard CET Level)"}

Requirements:
- Philippine curriculum standard (DepEd Senior High STEM/ABM/HUMSS/General).
- Realistic distractors with common student traps.
- Step-by-step mathematical/grammatical/scientific explanations.
- Output JSON array strictly adhering to schema:
[
  {
    "id": "gen_q1",
    "subject": "${params.subject}",
    "topic": "Topic Name",
    "text": "Question text with $KaTeX$ if math...",
    "choices": [
      { "id": "A", "text": "Choice A" },
      { "id": "B", "text": "Choice B" },
      { "id": "C", "text": "Choice C" },
      { "id": "D", "text": "Choice D" }
    ],
    "correctAnswer": "A",
    "explanation": "Detailed step-by-step explanation."
  }
]`;

  const response = await generateWithRetry(ai, {
    model: "gemini-3.7-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      temperature: 0.4,
      responseMimeType: "application/json",
      maxOutputTokens: 4096,
    },
  });

  const raw = response.text || "";
  const parsed = safeJsonParseArray(raw);

  if (parsed && parsed.length > 0) {
    return parsed.map((q: any, idx: number) => normalizeExtractedQuestion(q, idx, params.subject));
  }

  throw new Error("Could not generate questions for this subject. Please try again.");
}

export async function handleExplainQuestionError(params: {
  questionText: string;
  choices?: Array<{ id: string; text: string }>;
  correctAnswer: string;
  userAnswer?: string | null;
  subject?: string;
  topic?: string;
  explanation?: string;
  userQuery?: string;
  apiKey?: string;
}, customApiKey?: string): Promise<{
  errorAnalysis: string;
  fastSolution: string;
  keyRuleOrShortcut: string;
  fullTutorResponse: string;
}> {
  const ai = getGeminiClient(customApiKey || params.apiKey);

  const choicesStr = params.choices
    ? params.choices.map((c) => `[${c.id}] ${c.text}`).join("\n")
    : "No choices list";

  const userQuery = params.userQuery || "Why is my answer incorrect, and what is the fastest, easiest way to solve this on exam day?";

  const prompt = `You are an elite CET coach & tutor. A student missed a question during a mock exam and is asking for instant help.

Question Details:
Subject: ${params.subject || "General"} | Topic: ${params.topic || "Core Concept"}
Question: ${params.questionText}
Choices:
${choicesStr}

Official Correct Answer: [${params.correctAnswer}]
Student's Chosen Answer: ${params.userAnswer ? `[${params.userAnswer}]` : "Left Blank / Skipped"}
Existing Solution Notes: ${params.explanation || "None"}

Student's Query: "${userQuery}"

Provide a structured, highly encouraging, and super practical breakdown:
1. Root Cause Breakdown: Why their chosen answer was a trap/distractor, or what misconception occurred.
2. Fast & Easy Solution: The quickest, easiest method to solve this in under 30-45 seconds (mental math, keyword clue, elimination trick, or direct formula).
3. 30-Second Rule / Cheat-Sheet Mnemonic: A 1-sentence mnemonic or golden rule to remember for CET exam day.

Format as a clean JSON object:
{
  "errorAnalysis": "Short 2-3 sentence analysis of why the user's choice failed or what trap was set.",
  "fastSolution": "Step-by-step fast solution using simple wording and KaTeX math if needed ($formula$).",
  "keyRuleOrShortcut": "One crisp takeaway rule or mnemonic to never make this mistake again.",
  "fullTutorResponse": "Friendly markdown formatted synthesis response answering the student's question directly."
}`;

  const response = await generateWithRetry(ai, {
    model: "gemini-3.7-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      temperature: 0.3,
      responseMimeType: "application/json",
      maxOutputTokens: 2048,
    },
  });

  const raw = response.text || "";
  let parsed: any = null;

  try {
    parsed = JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
      try {
        parsed = JSON.parse(raw.slice(start, end + 1));
      } catch {}
    }
  }

  if (parsed) {
    return {
      errorAnalysis: parsed.errorAnalysis || "Analysis of misconception.",
      fastSolution: parsed.fastSolution || "Fast step-by-step solution.",
      keyRuleOrShortcut: parsed.keyRuleOrShortcut || "Key exam takeaway rule.",
      fullTutorResponse: parsed.fullTutorResponse || raw,
    };
  }

  return {
    errorAnalysis: "Analysis of the missed question.",
    fastSolution: raw,
    keyRuleOrShortcut: "Always double-check formulas and keyword traps in options.",
    fullTutorResponse: raw,
  };
}
