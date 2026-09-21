import React, { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  addBankQuestions,
  deleteBankQuestion,
  BankQuestion,
  parseRawQuestionBankText,
  getBannedQuestions,
  unbanQuestion,
  resetBannedQuestions,
  clearPastQuizHistory,
  unbanAllQuestions,
  getQuizzedRepeatBannedQuestions,
  removePastQuizQuestion,
  PastQuizQuestion,
} from "@/lib/questionBank";
import { SUBJECT_LABELS, getAvailableSubjectsForUniversity, getDefaultItemCounts } from "@/lib/format";
import { SmartText } from "@/components/SmartText";
import { AILimitCounter } from "@/components/AILimitCounter";
import { checkCanUseAI, recordAIUsage } from "@/lib/aiQuota";
import { getStoredGeminiApiKey, getAIHeaders } from "@/lib/geminiKey";
import { extractTextFromPdfFile } from "@/lib/pdfExtractor";
import { buildAIPromptForUniversity } from "@/lib/promptCalibrations";
import {
  FileText,
  UploadCloud,
  Sparkles,
  Bot,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Plus,
  FileCheck,
  Edit3,
  Copy,
  Upload,
  Check,
  Trash2,
  X,
  HelpCircle,
  Layers,
  Wand2,
  FileCode,
  BookOpen,
  ExternalLink,
  RotateCcw,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TRACKED_UNIVERSITIES } from "@/lib/userUniversities";

export interface AIQuestionBankStudioProps {
  universityId: string;
  onQuestionsAdded: () => void;
  open?: boolean;
  onClose?: () => void;
  testItemCounts?: Record<string, number>;
}

// ─── Direct Number Input (no mouse wheel scroll, direct typing & auto select) ───
function DirectNumberInput({
  value,
  onChange,
  disabled,
  min = 1,
  max = 200,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  className?: string;
}) {
  const [raw, setRaw] = useState(String(value));

  useEffect(() => {
    setRaw(String(value));
  }, [value]);

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      disabled={disabled}
      value={raw}
      onWheel={(e) => (e.target as HTMLElement).blur()}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "" || /^\d+$/.test(v)) {
          setRaw(v);
          const parsed = parseInt(v, 10);
          if (!isNaN(parsed) && parsed > 0) {
            onChange(parsed);
          }
        }
      }}
      onFocus={(e) => e.target.select()}
      onBlur={() => {
        const n = parseInt(raw, 10);
        const finalVal = isNaN(n) || n < min ? min : Math.min(max, n);
        setRaw(String(finalVal));
        onChange(finalVal);
      }}
      className={cn(
        "w-14 h-7 text-xs font-semibold text-center rounded-md border border-input bg-background shadow-xs transition-colors",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
        className
      )}
    />
  );
}

export function AIQuestionBankStudio({
  universityId,
  onQuestionsAdded,
  open = true,
  onClose,
  testItemCounts,
}: AIQuestionBankStudioProps) {
  const [activeTab, setActiveTab] = useState<"notebooklm" | "prompt_paste" | "manual" | "generate" | "pdf" | "banned">("notebooklm");

  const tabsRef = useRef<HTMLDivElement | null>(null);

  const setTabsRef = useCallback((node: HTMLDivElement | null) => {
    if (tabsRef.current) {
      const prevNode = tabsRef.current;
      const prevHandler = (prevNode as any)._handleWheel;
      if (prevHandler) {
        prevNode.removeEventListener("wheel", prevHandler);
      }
    }
    
    tabsRef.current = node;
    
    if (node) {
      const handleWheel = (e: WheelEvent) => {
        if (e.deltaY !== 0) {
          e.preventDefault();
          node.scrollLeft += e.deltaY;
        }
      };
      node.addEventListener("wheel", handleWheel, { passive: false });
      (node as any)._handleWheel = handleWheel;
    }
  }, []);

  // Lock parent page background scroll when uploader/studio is open
  useEffect(() => {
    if (open && onClose) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [open, onClose]);

  const availableSubjects = getAvailableSubjectsForUniversity(universityId);

  // Success Notification
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. PDF UPLOAD STATE
  // ─────────────────────────────────────────────────────────────────────────────
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [subjectHint, setSubjectHint] = useState<string>("auto");
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{
    status: string;
    percent: number;
    foundCount?: number;
  } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [extractedQuestions, setExtractedQuestions] = useState<BankQuestion[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. MANUAL ENTRY STATE
  // ─────────────────────────────────────────────────────────────────────────────
  const [manualSubject, setManualSubject] = useState<string>(availableSubjects[0]?.id || "math");
  const [manualTopic, setManualTopic] = useState<string>("");
  const [manualPassage, setManualPassage] = useState<string>("");
  const [manualQuestion, setManualQuestion] = useState<string>("");
  const [manualChoiceA, setManualChoiceA] = useState<string>("");
  const [manualChoiceB, setManualChoiceB] = useState<string>("");
  const [manualChoiceC, setManualChoiceC] = useState<string>("");
  const [manualChoiceD, setManualChoiceD] = useState<string>("");
  const [manualCorrect, setManualCorrect] = useState<"A" | "B" | "C" | "D">("A");
  const [manualExplanation, setManualExplanation] = useState<string>("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [recentlyAddedManual, setRecentlyAddedManual] = useState<BankQuestion[]>([]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. AI SUBJECT GENERATOR STATE
  // ─────────────────────────────────────────────────────────────────────────────
  const [genSubject, setGenSubject] = useState<string>(availableSubjects[0]?.id || "math");
  const [genTopic, setGenTopic] = useState<string>("");
  const [genCount, setGenCount] = useState<number>(3);
  const [genDifficulty, setGenDifficulty] = useState<string>("standard");
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<BankQuestion[]>([]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. PROMPT GENERATOR, NOTEBOOKLM & PASTE STATE
  // ─────────────────────────────────────────────────────────────────────────────
  const NOTEBOOK_URLS: Record<string, { name: string; url: string; active: boolean }> = {
    upcat: {
      name: "UPCAT Reviewer Notebook",
      url: "https://notebook.google.com/notebook/176db6d9-b9b8-47e9-a65b-b65499e63db9",
      active: true,
    },
    ateneo: {
      name: "ACET Reviewer Notebook",
      url: "https://notebook.google.com/notebook/2c189a47-3cc8-4bc5-8ecd-ac338dcdfbc4",
      active: true,
    },
    acet: {
      name: "ACET Reviewer Notebook",
      url: "https://notebook.google.com/notebook/2c189a47-3cc8-4bc5-8ecd-ac338dcdfbc4",
      active: true,
    },
    bucet: {
      name: "BUCET Reviewer Notebook",
      url: "https://notebook.google.com/notebook/176db6d9-b9b8-47e9-a65b-b65499e63db9",
      active: true,
    },
    bu: {
      name: "BUCET Reviewer Notebook",
      url: "https://notebook.google.com/notebook/176db6d9-b9b8-47e9-a65b-b65499e63db9",
      active: true,
    },
    ustet: {
      name: "USTET Reviewer Notebook",
      url: "https://notebook.google.com/",
      active: false,
    },
    ust: {
      name: "USTET Reviewer Notebook",
      url: "https://notebook.google.com/",
      active: false,
    },
    dlsu: {
      name: "DLSU DCAT Reviewer Notebook",
      url: "https://notebook.google.com/",
      active: false,
    },
    dcat: {
      name: "DLSU DCAT Reviewer Notebook",
      url: "https://notebook.google.com/",
      active: false,
    },
  };

  const [promptSubTab, setPromptSubTab] = useState<"notebooklm" | "generate_prompt">("notebooklm");
  const [notebookSubject, setNotebookSubject] = useState<string>(availableSubjects[0]?.id || "math");

  // Get test name and user-configured / default item counts for this university
  const examName = React.useMemo(() => {
    return TRACKED_UNIVERSITIES.find((u) => u.id === universityId.toLowerCase())?.shortName || universityId.toUpperCase();
  }, [universityId]);

  const savedLocalCounts = React.useMemo(() => {
    try {
      const raw = localStorage.getItem(`kolehiyotrack_test_item_counts_${universityId.toLowerCase()}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [universityId]);

  const defaultTestCount = React.useMemo(() => {
    return testItemCounts?.[notebookSubject] ?? savedLocalCounts?.[notebookSubject] ?? getDefaultItemCounts(universityId)[notebookSubject] ?? 10;
  }, [testItemCounts, savedLocalCounts, universityId, notebookSubject]);

  const [notebookCount, setNotebookCount] = useState<number>(3);
  const [notebookCopied, setNotebookCopied] = useState<boolean>(false);
  const [commandCopied, setCommandCopied] = useState<boolean>(false);
  const [showNotebookPromptDetails, setShowNotebookPromptDetails] = useState<boolean>(false);
  const [notebookPasteText, setNotebookPasteText] = useState<string>("");
  const [notebookPasteError, setNotebookPasteError] = useState<string | null>(null);
  const [notebookPasteResult, setNotebookPasteResult] = useState<{ added: number; skipped: number } | null>(null);

  const [genSelectedSubjects, setGenSelectedSubjects] = useState<Record<string, boolean>>(() =>
    availableSubjects.reduce((acc, s) => ({ ...acc, [s.id]: false }), {})
  );
  const [genItemCounts, setGenItemCounts] = useState<Record<string, number>>(() =>
    getDefaultItemCounts(universityId)
  );
  const [generatedPrompt, setGeneratedPrompt] = useState<string>("");
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  const [pasteText, setPasteText] = useState<string>("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [pasteResult, setPasteResult] = useState<{ added: number; skipped: number } | null>(null);
  const pasteFileInputRef = useRef<HTMLInputElement>(null);

  // Sync available subjects on university change
  useEffect(() => {
    if (availableSubjects.length > 0) {
      if (!availableSubjects.some((s) => s.id === genSubject)) {
        setGenSubject(availableSubjects[0].id);
      }
      if (!availableSubjects.some((s) => s.id === manualSubject)) {
        setManualSubject(availableSubjects[0].id);
      }
      if (!availableSubjects.some((s) => s.id === notebookSubject)) {
        setNotebookSubject(availableSubjects[0].id);
      }
      setGenSelectedSubjects(availableSubjects.reduce((acc, s) => ({ ...acc, [s.id]: false }), {}));
      setGenItemCounts(getDefaultItemCounts(universityId));
    }
  }, [universityId]);

  const [bannedSubTab, setBannedSubTab] = useState<"quizzed" | "manual">("quizzed");
  const [bannedSearch, setBannedSearch] = useState<string>("");

  if (!open) return null;

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPERS FOR PDF SCAN
  // ─────────────────────────────────────────────────────────────────────────────
  const updateExtractedSubject = (index: number, newSubject: string) => {
    setExtractedQuestions((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], subject: newSubject };
      }
      return updated;
    });
  };

  const setAllExtractedSubject = (newSubject: string) => {
    setExtractedQuestions((prev) =>
      prev.map((q) => ({
        ...q,
        subject: newSubject,
      }))
    );
  };

  const handleFileSelect = (file: File) => {
    if (!file) return;
    setSelectedFile(file);
    setScanError(null);
    setExtractedQuestions([]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1] || result;
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const convertFileToText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  };

  const handleScanPdf = async () => {
    if (!selectedFile) {
      setScanError("Please select a PDF or document first.");
      return;
    }

    const quotaCheck = checkCanUseAI();
    if (!quotaCheck.allowed) {
      setScanError(quotaCheck.reason || "Daily AI request limit reached. Please wait a moment or try again tomorrow.");
      return;
    }

    setIsScanning(true);
    setScanProgress({ status: "Extracting text & parsing document...", percent: 20, foundCount: 0 });
    setScanError(null);
    setSuccessMessage(null);
    setExtractedQuestions([]);

    try {
      const isPdf = selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf");
      const isText = selectedFile.type.startsWith("text/") || selectedFile.name.toLowerCase().endsWith(".txt");

      let payload: any = {
        universityId,
        subjectHint: subjectHint === "auto" ? undefined : subjectHint,
      };

      if (isPdf) {
        setScanProgress({ status: "Extracting text layers from PDF...", percent: 25, foundCount: 0 });
        try {
          const pdfData = await extractTextFromPdfFile(selectedFile, (status, pct) => {
            setScanProgress({ status, percent: Math.min(40, pct), foundCount: 0 });
          });

          if (pdfData.hasTextLayer && pdfData.fullText.trim().length > 60) {
            payload.textContent = pdfData.fullText;
          } else {
            const base64 = await convertFileToBase64(selectedFile);
            payload.fileBase64 = base64;
            payload.fileMimeType = "application/pdf";
          }
        } catch (pdfErr) {
          console.warn("Client pdf extraction fallback:", pdfErr);
          const base64 = await convertFileToBase64(selectedFile);
          payload.fileBase64 = base64;
          payload.fileMimeType = "application/pdf";
        }
      } else if (isText) {
        setScanProgress({ status: "Parsing text document...", percent: 35, foundCount: 0 });
        const text = await convertFileToText(selectedFile);
        payload.textContent = text;
      } else {
        setScanProgress({
          status: "Analyzing visual exam document with AI...",
          percent: 40,
          foundCount: 0,
        });
        const base64 = await convertFileToBase64(selectedFile);
        payload.fileBase64 = base64;
        payload.fileMimeType = selectedFile.type || "image/png";
      }

      setScanProgress({ status: "Extracting all questions, choices, and KaTeX solutions with AI...", percent: 65, foundCount: 0 });

      const storedKey = getStoredGeminiApiKey();
      const res = await fetch("/api/gemini/extract-pdf", {
        method: "POST",
        headers: getAIHeaders(),
        body: JSON.stringify({
          ...payload,
          apiKey: storedKey || undefined,
        }),
      });

      let data: any = {};
      const responseText = await res.text();
      try {
        data = JSON.parse(responseText);
      } catch {
        if (res.status === 503) {
          throw new Error("The AI service is currently experiencing high demand. Please try again in a few moments.");
        } else if (res.status === 429) {
          throw new Error("AI request limit reached. Please wait a moment before trying again.");
        }
        throw new Error("Could not parse AI response. Please try again.");
      }

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to scan questions from document.");
      }

      if (Array.isArray(data.questions) && data.questions.length > 0) {
        setExtractedQuestions(data.questions);
        recordAIUsage("pdf_scan");
        setScanProgress({
          status: `Done! Extracted ${data.questions.length} questions successfully.`,
          percent: 100,
          foundCount: data.questions.length,
        });
      } else {
        setScanError("No multiple choice questions could be identified in this file. Please ensure it contains exam questions.");
      }
    } catch (err: any) {
      console.error("Scan error:", err);
      setScanError(err.message || "An error occurred while analyzing the document.");
    } finally {
      setIsScanning(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPERS FOR MANUAL ENTRY
  // ─────────────────────────────────────────────────────────────────────────────
  const handleAddManualQuestion = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setManualError(null);

    const qText = manualQuestion.trim();
    if (!qText) {
      setManualError("Please enter a question statement.");
      return;
    }

    const cA = manualChoiceA.trim();
    const cB = manualChoiceB.trim();
    const cC = manualChoiceC.trim();
    const cD = manualChoiceD.trim();

    if (!cA || !cB) {
      setManualError("Please provide at least choices A and B.");
      return;
    }

    const choices = [
      { id: "A", text: cA },
      { id: "B", text: cB },
    ];
    if (cC) choices.push({ id: "C", text: cC });
    if (cD) choices.push({ id: "D", text: cD });

    const newId = `custom_${manualSubject}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    let fullText = qText;
    if (manualPassage.trim()) {
      fullText = `PASSAGE:\n${manualPassage.trim()}\n\nQUESTION: ${qText}`;
    }

    const newQuestion: BankQuestion = {
      id: newId,
      subject: manualSubject,
      topic: manualTopic.trim() || undefined,
      text: fullText,
      choices,
      correctAnswer: manualCorrect,
      explanation: manualExplanation.trim() || "",
    };

    const res = addBankQuestions([newQuestion], universityId);
    if (res.added > 0) {
      setRecentlyAddedManual((prev) => [newQuestion, ...prev]);
      setSuccessMessage(`✓ Added 1 question to ${SUBJECT_LABELS[manualSubject] || manualSubject} bank!`);
      // Reset form text fields, but keep subject for easy consecutive entries
      setManualQuestion("");
      setManualChoiceA("");
      setManualChoiceB("");
      setManualChoiceC("");
      setManualChoiceD("");
      setManualExplanation("");
      onQuestionsAdded();

      setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);
    } else {
      setManualError("This question was identified as already taken in a previous quiz or past session. (Turn on 'Allow duplicate/repeated questions' in Settings to allow it).");
    }
  };

  const handleRemoveManualItem = (qId: string) => {
    deleteBankQuestion(qId, universityId);
    setRecentlyAddedManual((prev) => prev.filter((q) => q.id !== qId));
    onQuestionsAdded();
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPERS FOR AI SUBJECT GENERATION
  // ─────────────────────────────────────────────────────────────────────────────
  const handleGenerateSubjectQuestions = async () => {
    const quotaCheck = checkCanUseAI();
    if (!quotaCheck.allowed) {
      setGenError(quotaCheck.reason || "Daily AI request limit reached. Please wait a moment or try again tomorrow.");
      return;
    }

    setIsGenerating(true);
    setGenError(null);
    setSuccessMessage(null);

    try {
      const storedKey = getStoredGeminiApiKey();
      const res = await fetch("/api/gemini/generate-subject-questions", {
        method: "POST",
        headers: getAIHeaders(),
        body: JSON.stringify({
          subject: genSubject,
          universityId,
          topic: genTopic.trim() || undefined,
          count: genCount,
          difficulty: genDifficulty,
          bannedQuestions: getBannedQuestions(universityId).map((q) => q.text),
          apiKey: storedKey || undefined,
        }),
      });

      let data: any = {};
      const responseText = await res.text();
      try {
        data = JSON.parse(responseText);
      } catch {
        if (res.status === 503) {
          throw new Error("The AI service is currently experiencing high demand. Please try again in a few moments.");
        } else if (res.status === 429) {
          throw new Error("AI request limit reached. Please wait a moment before trying again.");
        }
        throw new Error("Could not parse AI response. Please try again.");
      }

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to generate questions.");
      }

      if (Array.isArray(data.questions) && data.questions.length > 0) {
        recordAIUsage("question_gen");
        setGeneratedQuestions(data.questions);
      } else {
        setGenError("Could not generate questions. Please try again.");
      }
    } catch (err: any) {
      console.error("Gen error:", err);
      setGenError(err.message || "An error occurred while generating questions.");
    } finally {
      setIsGenerating(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────────
  // HELPERS FOR NOTEBOOKLM (UNIVERSITY REVIEWER INTEGRATION)
  // ─────────────────────────────────────────────────────────────────────────────
  const getNotebookShorthandCommand = (uni: string, subj: string, count: number) => {
    // If university is UPCAT, standard default format is e.g. "3 math"
    // If university is another university (e.g. ACET), format is e.g. "3 acet math"
    const uniNormalized = uni.toLowerCase();
    const subjClean = subj.toLowerCase();
    if (uniNormalized === "upcat") {
      return `${count} ${subjClean}`;
    }
    return `${count} ${uniNormalized} ${subjClean}`;
  };

  const handleCopyCommandOnly = (cmdText: string) => {
    navigator.clipboard.writeText(cmdText);
    setCommandCopied(true);
    setTimeout(() => setCommandCopied(false), 2000);
  };

  const buildNotebookLMPrompt = (targetUni: string, subjId: string, count: number) => {
    const uniUpper = targetUni.toUpperCase();
    const isReading = subjId.startsWith("reading");
    const isEnglishReading = subjId === "reading_english";
    const isFilipino = subjId.includes("filipino");

    const subjDisplay = subjId === "math"
      ? "math"
      : subjId === "science"
      ? "science"
      : subjId === "language_english"
      ? "language_english"
      : subjId === "language_filipino"
      ? "language_filipino"
      : isReading
      ? (isEnglishReading ? "reading_english" : "reading_filipino")
      : subjId;

    if (isReading) {
      return `CRITICAL INSTRUCTION: Generate practice questions strictly base ONLY from the sources, reviewers, and study materials that are currently uploaded in this NotebookLM. Do not use outside knowledge or hallucinated information. Follow the format strictly with no extra text, conversational preamble, conversational greetings, or notes. Total questions must equal exactly ${count}. No repeating of questions across sets. Every question item must have a unique ID.

OUTPUT FORMAT FOR READING COMPREHENSION:

UNIVERSITY: ${uniUpper}
SUBJECT: READING ${isEnglishReading ? "ENGLISH" : "FILIPINO"}
PASSAGE:
[Insert the full passage text here only once]

ID: 1
QUESTION: [Question 1 text]
A) [Choice A]
B) [Choice B]
C) [Choice C]
D) [Choice D]
CORRECT: A
EXPLANATION: [Explanation referencing the passage text]

ID: 2
QUESTION: [Question 2 text]
A) [Choice A]
B) [Choice B]
C) [Choice C]
D) [Choice D]
CORRECT: B
EXPLANATION: [Explanation referencing the passage text]
---

Rules:
- Exactly 4 choices (A, B, C, D) per question.
- Only one correct answer.
- Keep the exact tags (UNIVERSITY:, SUBJECT:, PASSAGE:, ID:, QUESTION:, A), B), C), D), CORRECT:, EXPLANATION:).
- Separate passage groups with "---".
- No extra conversational text before or after the output blocks so it can be parsed directly into the question bank.`;
    }

    return `CRITICAL INSTRUCTION: Generate practice questions strictly base ONLY from the sources, reviewers, and study materials that are currently uploaded in this NotebookLM. Do not use outside knowledge or unverified facts. Follow the format strictly with no extra conversational text, commentary, or greetings. Total questions must equal exactly ${count}. No repeating of questions. Every single question must have a unique ID.

Format each question block exactly like this with a blank line and "---" separator between each question:

UNIVERSITY: ${uniUpper}
ID: q_${targetUni}_${subjDisplay}_1001
SUBJECT: ${subjDisplay}
TOPIC: [Topic title from uploaded reviewer notes]
QUESTION: [Question text. Use KaTeX notation for mathematical expressions, e.g. $2x + 5 = 15$ or $\\frac{a}{b}$]
A) [Choice A]
B) [Choice B]
C) [Choice C]
D) [Choice D]
CORRECT: A
EXPLANATION: [Step-by-step solution based strictly on reviewer sources]
DIAGRAM: { "shape": "rightTriangle", "vertices": ["A","B","C"], "sides": {"AB":"5","BC":"12","AC":"?"}, "angles": {"B":"30°"}, "show": ["vertices","sides","angles","rightAngleMark"] } // ONLY include if the question has a geometric shape, otherwise omit the DIAGRAM line completely
---

Rules:
- Exactly 4 choices (A, B, C, D) per question.
- Only one correct answer.
- Subject values: language_english | language_filipino | math | science | reading_english | reading_filipino | numerical_ability | logical_reasoning | abstract_reasoning | general_info
- Put DIAGRAM only when there is a geometric diagram, otherwise DO NOT include the DIAGRAM line.
- Put PASSAGE only when there is a passage, otherwise DO NOT include the PASSAGE line.
- Strictly keep the exact tags (UNIVERSITY:, ID:, SUBJECT:, TOPIC:, QUESTION:, A), B), C), D), CORRECT:, EXPLANATION:).
- Output exactly ${count} question blocks. No extra conversational text before or after so it imports directly.`;
  };

  const handleNotebookCopyAndOpen = () => {
    const prompt = buildNotebookLMPrompt(universityId, notebookSubject, notebookCount);
    navigator.clipboard.writeText(prompt);
    setNotebookCopied(true);
    setTimeout(() => setNotebookCopied(false), 3000);

    const targetConfig = NOTEBOOK_URLS[universityId.toLowerCase()] || NOTEBOOK_URLS.upcat;
    window.open(targetConfig.url, "_blank", "noopener,noreferrer");
  };

  const parseAndSaveNotebookText = () => {
    setNotebookPasteError(null);
    setNotebookPasteResult(null);

    if (!notebookPasteText.trim()) {
      setNotebookPasteError("Please paste the generated output from your NotebookLM chat first.");
      return;
    }

    try {
      // Pass universityId as fallbackUniId so any questions route directly to the active university
      const valid = parseRawQuestionBankText(notebookPasteText, universityId, notebookSubject);

      if (!valid || valid.length === 0) {
        setNotebookPasteError(
          "Could not detect question blocks. Please make sure the output contains 'QUESTION:', choices A, B, C, D, and 'CORRECT:'."
        );
        return;
      }

      const res = addBankQuestions(valid, universityId);
      setNotebookPasteResult(res);
      if (res.added > 0) {
        onQuestionsAdded();
        setNotebookPasteText("");
      }
    } catch (err: any) {
      setNotebookPasteError(`Parsing error: ${err.message || "Invalid format"}`);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPERS FOR PROMPT GENERATOR & PASTE
  // ─────────────────────────────────────────────────────────────────────────────
  const buildPrompt = () => {
    const prompt = buildAIPromptForUniversity(
      universityId,
      availableSubjects,
      genSelectedSubjects,
      genItemCounts
    );

    setGeneratedPrompt(prompt);
    setCustomPrompt(prompt);
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(customPrompt || generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const parseAndSavePaste = (textToParse: string) => {
    setPasteError(null);
    setPasteResult(null);

    if (!textToParse.trim()) {
      setPasteError("Please paste some text or JSON first.");
      return;
    }

    try {
      const valid = parseRawQuestionBankText(textToParse, universityId);

      if (!valid || valid.length === 0) {
        setPasteError("Could not parse input. Please ensure it follows the format (ID:, SUBJECT:, QUESTION:, A), B), C), D), CORRECT:, EXPLANATION:) or a JSON array.");
        return;
      }

      const res = addBankQuestions(valid, universityId);
      setPasteResult(res);
      onQuestionsAdded();
      setPasteText("");
    } catch (err: any) {
      setPasteError(`Parsing error: ${err.message || "Invalid format"}`);
    }
  };

  const handlePasteFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      parseAndSavePaste(text);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleCommitQuestions = (questions: BankQuestion[], source: "extracted" | "generated") => {
    if (questions.length === 0) return;

    const result = addBankQuestions(questions, universityId);

    const countsBySubject: Record<string, number> = {};
    questions.forEach((q) => {
      const label = SUBJECT_LABELS[q.subject] || q.subject;
      countsBySubject[label] = (countsBySubject[label] || 0) + 1;
    });

    const breakdownText = Object.entries(countsBySubject)
      .map(([subj, count]) => `${count} ${subj}`)
      .join(", ");

    if (result.added > 0) {
      setSuccessMessage(
        `Successfully added ${result.added} question${result.added !== 1 ? "s" : ""} (${breakdownText}) to your ${universityId.toUpperCase()} bank!${result.skipped > 0 ? ` (${result.skipped} repeated from previous quizzes/sessions skipped)` : ""}`
      );
    } else {
      setSuccessMessage(
        `All ${result.skipped} question${result.skipped !== 1 ? "s were" : " was"} skipped because they have already appeared in your previous quizzes or past sessions. (Turn on 'Allow duplicate/repeated questions' in Settings to allow them).`
      );
    }

    if (source === "extracted") {
      setExtractedQuestions([]);
      setSelectedFile(null);
    } else {
      setGeneratedQuestions([]);
    }

    onQuestionsAdded();

    setTimeout(() => {
      setSuccessMessage(null);
    }, 6000);
  };

  // Modal Container
  const modalWrapper = (content: React.ReactNode) => {
    if (onClose) {
      return (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div className="bg-background border-2 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
            {content}
          </div>
        </div>
      );
    }
    return <div className="w-full">{content}</div>;
  };

  return modalWrapper(
    <div className="flex flex-col h-full overflow-hidden">
      {/* ─── MODAL HEADER ─── */}
      <div className="p-4 sm:p-5 bg-muted/25 border-b shrink-0 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                Question Bank Uploader & Studio
                <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/30 uppercase tracking-wider bg-primary/5">
                  {universityId.toUpperCase()}
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground">
                Add practice exam questions via PDF AI scanner, manual creation, subject generation, or chatbot prompts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <AILimitCounter compact />
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer ml-1"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* ─── TAB NAVIGATION BAR WITH MINIMALIST SCROLLBARS ─── */}
      <style>{`
        .custom-studio-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-studio-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-studio-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.25);
          border-radius: 999px;
        }
        .custom-studio-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(156, 163, 175, 0.45);
        }
        .custom-studio-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(156, 163, 175, 0.25) transparent;
        }
      `}</style>
      <div
        ref={setTabsRef}
        className="flex border-b bg-muted/10 px-4 pt-1 overflow-x-auto custom-studio-scrollbar shrink-0"
      >
        <button
          onClick={() => setActiveTab("notebooklm")}
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer",
            activeTab === "notebooklm"
              ? "border-primary text-primary bg-primary/5 rounded-t-lg"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
          )}
        >
          <BookOpen className="h-4 w-4 text-blue-500" />
          <span>NotebookLM</span>
        </button>

        <button
          onClick={() => setActiveTab("prompt_paste")}
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer",
            activeTab === "prompt_paste"
              ? "border-primary text-primary bg-primary/5 rounded-t-lg"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
          )}
        >
          <Bot className="h-4 w-4 text-indigo-500" />
          <span>Generate using external AI</span>
        </button>
 
        <button
          onClick={() => setActiveTab("manual")}
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer",
            activeTab === "manual"
              ? "border-primary text-primary bg-primary/5 rounded-t-lg"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
          )}
        >
          <Edit3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>Create questions manually</span>
        </button>
 
        <button
          onClick={() => setActiveTab("generate")}
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer",
            activeTab === "generate"
              ? "border-primary text-primary bg-primary/5 rounded-t-lg"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
          )}
        >
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span>Generate using AI</span>
        </button>
 
        <button
          onClick={() => setActiveTab("pdf")}
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer",
            activeTab === "pdf"
              ? "border-primary text-primary bg-primary/5 rounded-t-lg"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
          )}
        >
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span>Scan PDF</span>
          <span className="ml-1 text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            Beta · Not working yet
          </span>
        </button>
 
        <button
          onClick={() => setActiveTab("banned")}
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer",
            activeTab === "banned"
              ? "border-primary text-primary bg-primary/5 rounded-t-lg"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
          )}
        >
          <span className="text-xs">🚫</span>
          <span>Block questions</span>
        </button>
      </div>
 
      {/* ─── MODAL BODY / SCROLLABLE CONTENT WITH MINIMALIST SCROLLBAR ─── */}
      <div className="p-4 sm:p-6 overflow-y-auto custom-studio-scrollbar flex-1 space-y-5">
        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-medium flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {/* ─── TAB 1: NOTEBOOKLM (UNIVERSITY REVIEWERS) ─── */}
        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "notebooklm" && (
          <div className="space-y-4">
            {/* ─── NOTEBOOKLM (UNIVERSITY REVIEWERS) ─── */}
            <div className="space-y-4">
              {/* Step 1: Command & Configuration */}
                {(() => {
                  const currentCmd = getNotebookShorthandCommand(universityId, notebookSubject, notebookCount);
                  const uniUpper = universityId.toUpperCase();
                  const targetConfig = NOTEBOOK_URLS[universityId.toLowerCase()] || NOTEBOOK_URLS.upcat;

                  return (
                    <div className="p-4 rounded-xl border bg-card/60 space-y-3.5 shadow-xs">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="space-y-0.5">
                          <Label className="text-xs font-bold text-foreground">
                            Step 1: Click to copy command or customize shortcuts:
                          </Label>
                          <p className="text-[11px] text-muted-foreground">
                            Click anywhere on the command button to copy your Notebook prompt.
                          </p>
                        </div>
                        {targetConfig.active && (
                          <a
                            href={targetConfig.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline bg-background/80 px-2.5 py-1 rounded-lg border border-blue-500/30 shadow-xs cursor-pointer"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Open {uniUpper} NotebookLM</span>
                          </a>
                        )}
                      </div>

                      {/* Click to Copy Command Banner / Button */}
                      <button
                        type="button"
                        id="btn-copy-notebook-command"
                        onClick={() => handleCopyCommandOnly(currentCmd)}
                        title="Click to copy command"
                        className={cn(
                          "w-full group relative flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-all cursor-pointer text-left font-mono",
                          commandCopied
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-200 shadow-xs"
                            : "bg-background/90 hover:bg-muted/40 border-primary/30 hover:border-primary/60 text-foreground shadow-xs"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={cn(
                            "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                            commandCopied ? "bg-emerald-500/20 text-emerald-600" : "bg-primary/10 text-primary"
                          )}>
                            <Sparkles className="h-4 w-4" />
                          </div>
                          <div className="truncate">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                              Shorthand Command (Click to Copy)
                            </span>
                            <span className="text-sm font-bold tracking-wide">
                              {currentCmd}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-sans font-semibold transition-all">
                          {commandCopied ? (
                            <>
                              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-emerald-700 dark:text-emerald-300 font-bold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                              <span className="text-foreground">Copy Command</span>
                            </>
                          )}
                        </div>
                      </button>

                      {/* Subject Shortcut Pills */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-muted-foreground">Subject:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {availableSubjects.map((s) => {
                            const isSelected = notebookSubject === s.id;
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => setNotebookSubject(s.id)}
                                className={cn(
                                  "px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer",
                                  isSelected
                                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                    : "bg-muted/40 text-muted-foreground border-border hover:text-foreground hover:bg-muted"
                                )}
                              >
                                {s.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Quantity Shortcut Chips */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-semibold text-muted-foreground">Number of questions:</span>
                            <button
                              type="button"
                              id="btn-quick-default-count"
                              onClick={() => setNotebookCount(defaultTestCount)}
                              className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md border transition-all cursor-pointer",
                                notebookCount === defaultTestCount
                                  ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                                  : "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 hover:border-primary/50"
                              )}
                              title={`Set to ${examName} test configuration (${defaultTestCount} items)`}
                            >
                              <Sparkles className="h-3 w-3" />
                              <span>{examName} Default ({defaultTestCount} items)</span>
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <DirectNumberInput
                              value={notebookCount}
                              min={1}
                              max={200}
                              onChange={(val) => setNotebookCount(val)}
                            />
                            <span className="text-[11px] text-muted-foreground">items</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {/* Dedicated Default Button */}
                          <button
                            type="button"
                            id="btn-default-test-count"
                            onClick={() => setNotebookCount(defaultTestCount)}
                            className={cn(
                              "px-2.5 py-1 text-xs font-semibold rounded-md border transition-all cursor-pointer flex items-center gap-1.5",
                              notebookCount === defaultTestCount
                                ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold ring-1 ring-primary/40"
                                : "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 hover:border-primary/50 font-medium"
                            )}
                            title={`Set to ${examName} test items (${defaultTestCount} items)`}
                          >
                            <Sparkles className="h-3 w-3" />
                            <span>{examName} Default ({defaultTestCount} items)</span>
                          </button>

                          {[3, 5, 10, 15, 20, 25, 30, 50, ...(defaultTestCount > 50 ? [defaultTestCount] : [])]
                            .filter((count, index, self) => self.indexOf(count) === index && count !== defaultTestCount)
                            .sort((a, b) => a - b)
                            .map((count) => (
                              <button
                                key={count}
                                type="button"
                                onClick={() => setNotebookCount(count)}
                                className={cn(
                                  "px-2.5 py-1 text-xs font-semibold rounded-md border transition-all cursor-pointer",
                                  notebookCount === count
                                    ? "bg-secondary text-secondary-foreground border-secondary-foreground/30 font-bold"
                                    : "bg-background text-muted-foreground border-border hover:text-foreground"
                                )}
                              >
                                {count} items
                              </button>
                            ))}
                        </div>
                      </div>

                      {/* Action Button: Copy Full Prompt & Open */}
                      <div className="pt-1">
                        <Button
                          type="button"
                          id="btn-copy-and-open-notebook"
                          onClick={handleNotebookCopyAndOpen}
                          className="w-full h-10 text-xs font-bold gap-2 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-sm transition-all"
                        >
                          {notebookCopied ? (
                            <>
                              <Check className="h-4 w-4 text-emerald-300" />
                              <span>Copied Full Prompt! Opening {uniUpper} NotebookLM...</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              <span>Copy Full Prompt & Open {uniUpper} NotebookLM</span>
                              <ExternalLink className="h-3.5 w-3.5 opacity-80 ml-0.5" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })()}

                {/* Step 2: Paste Output & Save */}
                <div className="p-4 rounded-xl border bg-card/60 space-y-3 shadow-xs">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-foreground">
                      Step 2: Paste output from NotebookLM & Save to Bank:
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      After NotebookLM finishes responding, copy the text and paste it below. KaTeX math formulas ($...$), geometric diagrams, reading passages, and question blocks will be automatically formatted and routed to your {universityId.toUpperCase()} question bank.
                    </p>
                  </div>

                  <textarea
                    value={notebookPasteText}
                    onChange={(e) => setNotebookPasteText(e.target.value)}
                    placeholder={`UNIVERSITY: ${universityId.toUpperCase()}\nID: q_${universityId}_${notebookSubject}_1001\nSUBJECT: ${notebookSubject}\nTOPIC: Reviewer Topic\nQUESTION: What is the solution...\nA) 10\nB) 15\nC) 20\nD) 25\nCORRECT: B\nEXPLANATION: Step-by-step solution from reviewer notes.\n\n---\n\n(Or paste standard reading comprehension passage block / JSON array)`}
                    rows={6}
                    className="w-full text-xs font-mono rounded-xl border bg-background p-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                  />

                  {notebookPasteError && (
                    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{notebookPasteError}</span>
                    </div>
                  )}

                  {notebookPasteResult && (
                    <div
                      className={cn(
                        "p-3.5 rounded-xl border text-xs font-semibold flex items-start gap-2.5 animate-in fade-in",
                        notebookPasteResult.added > 0
                          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                          : "bg-amber-500/15 border-amber-500/30 text-amber-800 dark:text-amber-200"
                      )}
                    >
                      {notebookPasteResult.added > 0 ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-0.5">
                        {notebookPasteResult.added > 0 ? (
                          <>
                            <div>
                              Successfully added {notebookPasteResult.added} question{notebookPasteResult.added !== 1 ? "s" : ""} to your {universityId.toUpperCase()} bank!
                              {notebookPasteResult.skipped > 0 && ` (${notebookPasteResult.skipped} repeated from previous quizzes/sessions skipped)`}
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              All {notebookPasteResult.skipped} question{notebookPasteResult.skipped !== 1 ? "s were" : " was"} identified as already tested in previous quizzes or past sessions and skipped.
                            </div>
                            <p className="text-[11px] font-normal opacity-90">
                              To allow duplicate questions anyway, turn on "Allow duplicate/repeated questions" in Settings.
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <Button
                      type="button"
                      onClick={parseAndSaveNotebookText}
                      disabled={!notebookPasteText.trim()}
                      className="font-semibold text-xs h-9 px-5 gap-2 bg-primary hover:bg-primary/90 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      Save Questions to {universityId.toUpperCase()} Question Bank
                    </Button>
                  </div>
                </div>
              </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {/* ─── TAB 2: GENERATE USING EXTERNAL AI (GEMINI / DEEPSEEK / CHATGPT) ─── */}
        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "prompt_paste" && (
          <div className="space-y-5">
            {/* Step 1: Select Subjects & Question Counts */}
            <div className="p-4 rounded-xl border bg-card/60 space-y-4 shadow-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Step 1: Select Subjects & Question Counts
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Choose which subjects to include and set item counts for your {universityId.toUpperCase()} prompt.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] px-2.5 rounded-lg cursor-pointer gap-1"
                    onClick={() => {
                      const countsToUse = testItemCounts || savedLocalCounts || getDefaultItemCounts(universityId);
                      setGenItemCounts({ ...countsToUse });
                    }}
                    title={`Reset question counts to ${examName} test settings`}
                  >
                    <Sparkles className="h-3 w-3 text-primary" />
                    <span>{examName} Defaults</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] px-2.5 rounded-lg cursor-pointer"
                    onClick={() => {
                      const allSelected = availableSubjects.every((s) => genSelectedSubjects[s.id]);
                      setGenSelectedSubjects(
                        availableSubjects.reduce((acc, s) => ({ ...acc, [s.id]: !allSelected }), {})
                      );
                    }}
                  >
                    {availableSubjects.every((s) => genSelectedSubjects[s.id]) ? "Deselect All" : "Select All"}
                  </Button>
                </div>
              </div>

              {/* Subject Grid with Checkboxes & Item Counts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {availableSubjects.map((subject) => {
                  const isSelected = !!genSelectedSubjects[subject.id];
                  const count = genItemCounts[subject.id] || 10;
                  return (
                    <div
                      key={subject.id}
                      onClick={() => {
                        setGenSelectedSubjects((prev) => ({
                          ...prev,
                          [subject.id]: !prev[subject.id],
                        }));
                      }}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none",
                        isSelected
                          ? "bg-primary/10 border-primary/50 text-foreground shadow-xs"
                          : "bg-card border-border text-foreground hover:bg-muted/30 hover:border-primary/30"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/40 pointer-events-none"
                        />
                        <span className="text-xs font-semibold text-foreground">{subject.label}</span>
                      </div>

                      <div
                        className="flex items-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DirectNumberInput
                          min={1}
                          max={100}
                          value={count}
                          disabled={!isSelected}
                          onChange={(val) =>
                            setGenItemCounts((prev) => ({
                              ...prev,
                              [subject.id]: val,
                            }))
                          }
                          className="w-12 h-6 text-xs font-semibold"
                        />
                        <span className="text-[11px] font-medium text-foreground/80">items</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button
                type="button"
                onClick={buildPrompt}
                className="w-full h-9 text-xs font-semibold gap-2 bg-primary hover:bg-primary/90 cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                Generate {universityId.toUpperCase()} Calibration Prompt
              </Button>
            </div>

            {/* Step 2: Generated Prompt & External AI Launch Shortcuts */}
            {generatedPrompt && (
              <div className="p-4 rounded-xl border bg-card/60 space-y-3.5 shadow-xs animate-in fade-in">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Copy className="h-3.5 w-3.5 text-primary" />
                      Step 2: Copy Prompt & Open External AI
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Click copy below, then paste into your preferred AI chatbot:
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={copied ? "default" : "outline"}
                    onClick={copyPrompt}
                    className="h-7 text-xs font-semibold px-3 gap-1.5 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Prompt</span>
                      </>
                    )}
                  </Button>
                </div>

                {/* External Chatbot Quick Links */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <a
                    href="https://gemini.google.com/app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Open Google Gemini</span>
                  </a>
                  <a
                    href="https://chat.deepseek.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Open DeepSeek</span>
                  </a>
                  <a
                    href="https://chatgpt.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Open ChatGPT</span>
                  </a>
                </div>

                {/* Prompt Preview / Edit Box */}
                <textarea
                  className="w-full text-xs bg-muted/40 border rounded-xl p-3 font-mono min-h-[140px] max-h-[260px] resize-y focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                />
              </div>
            )}

            {/* Step 3: Paste Output from AI Chatbot & Save */}
            <div className="p-4 rounded-xl border bg-card/60 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Upload className="h-3.5 w-3.5 text-primary" />
                    Step 3: Paste Questions & Save to Bank
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Paste the response from Gemini, DeepSeek, or ChatGPT (Text format with ID:, SUBJECT:, etc., or JSON array).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => pasteFileInputRef.current?.click()}
                    className="h-7 text-xs font-semibold px-2.5 gap-1.5 cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload .txt/.json</span>
                  </Button>
                  <input
                    ref={pasteFileInputRef}
                    type="file"
                    accept=".json,.txt,application/json,text/plain"
                    className="hidden"
                    onChange={handlePasteFileUpload}
                  />
                </div>
              </div>

              <textarea
                className="w-full min-h-[130px] rounded-xl border bg-background px-3 py-2 text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed"
                placeholder={'Paste questions from AI chatbot here:\n\nID: q1\nSUBJECT: Language English\nTOPIC: Vocabulary\nQUESTION: What is the meaning of PERTINENT?\nA) relevant\nB) distant\nC) vague\nD) trivial\nCORRECT: A\nEXPLANATION: Pertinent means relevant or applicable to a particular matter.\n\n---\n\nOr paste JSON array: [{"id": "q1", ...}]'}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
              />

              {pasteError && (
                <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-3">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="whitespace-pre-wrap leading-relaxed">{pasteError}</div>
                </div>
              )}

              {pasteResult && (
                <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-xl p-3">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    <strong>{pasteResult.added}</strong> questions added to {universityId.toUpperCase()} bank.
                    {pasteResult.skipped > 0 && (
                      <span className="text-muted-foreground ml-1">
                        ({pasteResult.skipped} duplicate or previous quiz questions skipped)
                      </span>
                    )}
                  </span>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  onClick={() => parseAndSavePaste(pasteText)}
                  disabled={!pasteText.trim()}
                  className="font-semibold text-xs h-9 px-5 gap-2 bg-primary hover:bg-primary/90 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Save Questions to {universityId.toUpperCase()} Question Bank
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {/* ─── TAB 3: MANUAL QUESTION ENTRY ─── */}
        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "manual" && (
          <form onSubmit={handleAddManualQuestion} className="space-y-4">
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-primary shrink-0" />
                <span>
                  Enter individual custom practice questions with full control over subject, choices, and answer keys.
                </span>
              </div>
              <Badge variant="secondary" className="text-[10px] font-bold shrink-0">
                {recentlyAddedManual.length} added this session
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Subject *</Label>
                <select
                  value={manualSubject}
                  onChange={(e) => setManualSubject(e.target.value)}
                  className="w-full h-9 text-xs rounded-lg border border-input bg-background px-3 py-1 text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium"
                >
                  {availableSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Topic / Sub-Concept (Optional)</Label>
                <Input
                  value={manualTopic}
                  onChange={(e) => setManualTopic(e.target.value)}
                  placeholder="e.g. Kinematics, Stoichiometry, Grammar"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Optional Reading Passage */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Reading Passage (Optional — for Reading Comprehension)
                </Label>
                {manualPassage && (
                  <button
                    type="button"
                    onClick={() => setManualPassage("")}
                    className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Clear Passage
                  </button>
                )}
              </div>
              <textarea
                value={manualPassage}
                onChange={(e) => setManualPassage(e.target.value)}
                placeholder="Paste reading passage or background context here..."
                rows={2}
                className="w-full text-xs rounded-lg border border-input bg-background p-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
              />
            </div>

            {/* Question Text */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Question Statement *</Label>
              <textarea
                value={manualQuestion}
                onChange={(e) => setManualQuestion(e.target.value)}
                placeholder="Type question here (supports LaTeX math such as $x^2 + 5x + 6 = 0$ or $F=ma$)..."
                rows={3}
                required
                className="w-full text-xs rounded-lg border border-input bg-background p-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
              />
            </div>

            {/* 4 Choices with Correct Answer Radio Button */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Choices & Correct Answer *</Label>
                <span className="text-[11px] text-muted-foreground">
                  Select the radio button next to the correct choice (currently: <strong>{manualCorrect}</strong>)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Choice A */}
                <div
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-xl border transition-all",
                    manualCorrect === "A"
                      ? "border-emerald-500/70 bg-emerald-500/10"
                      : "border-input bg-background"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setManualCorrect("A")}
                    className={cn(
                      "h-7 w-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 transition-colors cursor-pointer",
                      manualCorrect === "A"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    A
                  </button>
                  <Input
                    value={manualChoiceA}
                    onChange={(e) => setManualChoiceA(e.target.value)}
                    placeholder="Choice A text..."
                    required
                    className="h-8 text-xs border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1"
                  />
                </div>

                {/* Choice B */}
                <div
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-xl border transition-all",
                    manualCorrect === "B"
                      ? "border-emerald-500/70 bg-emerald-500/10"
                      : "border-input bg-background"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setManualCorrect("B")}
                    className={cn(
                      "h-7 w-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 transition-colors cursor-pointer",
                      manualCorrect === "B"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    B
                  </button>
                  <Input
                    value={manualChoiceB}
                    onChange={(e) => setManualChoiceB(e.target.value)}
                    placeholder="Choice B text..."
                    required
                    className="h-8 text-xs border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1"
                  />
                </div>

                {/* Choice C */}
                <div
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-xl border transition-all",
                    manualCorrect === "C"
                      ? "border-emerald-500/70 bg-emerald-500/10"
                      : "border-input bg-background"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setManualCorrect("C")}
                    className={cn(
                      "h-7 w-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 transition-colors cursor-pointer",
                      manualCorrect === "C"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    C
                  </button>
                  <Input
                    value={manualChoiceC}
                    onChange={(e) => setManualChoiceC(e.target.value)}
                    placeholder="Choice C text (optional)..."
                    className="h-8 text-xs border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1"
                  />
                </div>

                {/* Choice D */}
                <div
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-xl border transition-all",
                    manualCorrect === "D"
                      ? "border-emerald-500/70 bg-emerald-500/10"
                      : "border-input bg-background"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setManualCorrect("D")}
                    className={cn(
                      "h-7 w-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 transition-colors cursor-pointer",
                      manualCorrect === "D"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    D
                  </button>
                  <Input
                    value={manualChoiceD}
                    onChange={(e) => setManualChoiceD(e.target.value)}
                    placeholder="Choice D text (optional)..."
                    className="h-8 text-xs border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1"
                  />
                </div>
              </div>
            </div>

            {/* Explanation / Solution */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">
                Solution / Explanation (Optional)
              </Label>
              <textarea
                value={manualExplanation}
                onChange={(e) => setManualExplanation(e.target.value)}
                placeholder="Explain why the chosen answer is correct..."
                rows={2}
                className="w-full text-xs rounded-lg border border-input bg-background p-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
              />
            </div>

            {manualError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{manualError}</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                className="font-semibold text-xs h-9 px-5 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Add Question to Bank
              </Button>
            </div>

            {/* Recently Added Manual Items */}
            {recentlyAddedManual.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Recently Added in this Session ({recentlyAddedManual.length})
                  </h4>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {recentlyAddedManual.map((q) => (
                    <div
                      key={q.id}
                      className="p-3 rounded-xl border bg-card text-xs flex items-start justify-between gap-3 shadow-xs"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {SUBJECT_LABELS[q.subject] || q.subject}
                          </Badge>
                          {q.topic && <span className="text-[11px] text-muted-foreground">{q.topic}</span>}
                          <Badge className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-0">
                            Key: {q.correctAnswer}
                          </Badge>
                        </div>
                        <p className="font-medium text-foreground line-clamp-2">{q.text}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveManualItem(q.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 cursor-pointer"
                        title="Delete question"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>
        )}

        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {/* ─── TAB 3: AI GENERATE FOR SUBJECT ─── */}
        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "generate" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Subject</Label>
                <select
                  value={genSubject}
                  onChange={(e) => setGenSubject(e.target.value)}
                  className="w-full h-9 text-xs rounded-lg border border-input bg-background px-3 py-1 text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium"
                >
                  {availableSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-semibold">Topic / Sub-Concept (Optional)</Label>
                <Input
                  value={genTopic}
                  onChange={(e) => setGenTopic(e.target.value)}
                  placeholder="e.g. Quadratic equations, Photosynthesis, Sentence correction"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Number of Items</Label>
                <select
                  value={genCount.toString()}
                  onChange={(e) => setGenCount(parseInt(e.target.value, 10))}
                  className="w-full h-9 text-xs rounded-lg border border-input bg-background px-3 py-1 text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="1">1 Question</option>
                  <option value="3">3 Questions</option>
                  <option value="5">5 Questions</option>
                  <option value="10">10 Questions</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Difficulty</Label>
                <select
                  value={genDifficulty}
                  onChange={(e) => setGenDifficulty(e.target.value)}
                  className="w-full h-9 text-xs rounded-lg border border-input bg-background px-3 py-1 text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="standard">Standard CET</option>
                  <option value="advanced">Advanced / Tricky</option>
                </select>
              </div>

              <div className="col-span-2 flex items-end justify-end">
                <Button
                  onClick={handleGenerateSubjectQuestions}
                  disabled={isGenerating}
                  className="w-full font-semibold text-xs h-9 gap-2 bg-primary hover:bg-primary/90 cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating Questions...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-amber-400" />
                      Generate for {SUBJECT_LABELS[genSubject] || genSubject}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {genError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{genError}</span>
              </div>
            )}

            {/* Generated Questions Preview */}
            {generatedQuestions.length > 0 && (
              <div className="space-y-4 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <h4 className="font-bold text-sm text-foreground">
                      Generated {generatedQuestions.length} Question{generatedQuestions.length > 1 ? "s" : ""}
                    </h4>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleCommitQuestions(generatedQuestions, "generated")}
                    className="text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add to Question Bank
                  </Button>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
                  {generatedQuestions.map((q, idx) => (
                    <div key={q.id || idx} className="p-3.5 rounded-xl border bg-card text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-muted-foreground">Item #{idx + 1}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {q.topic || SUBJECT_LABELS[q.subject] || q.subject}
                        </Badge>
                      </div>
                      <SmartText text={q.text} className="text-xs text-foreground font-medium" />
                      <div className="grid grid-cols-2 gap-1.5 text-muted-foreground pt-1">
                        {q.choices.map((c) => (
                          <div
                            key={c.id}
                            className={cn(
                              "p-1.5 rounded-lg border",
                              c.id === q.correctAnswer
                                ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold"
                                : "bg-muted/30"
                            )}
                          >
                            <span className="font-bold mr-1">{c.id}.</span> {c.text}
                          </div>
                        ))}
                      </div>
                      {q.explanation && (
                        <p className="text-[11px] text-muted-foreground italic pt-1 border-t">
                          💡 <strong>Solution:</strong> {q.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {/* ─── TAB 4: PDF SCAN & AUTO SOLVE (AI) [BETA - NOT WORKING YET] ─── */}
        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "pdf" && (
          <div className="space-y-4">
            {/* Beta Version Banner */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 text-xs sm:text-sm flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-foreground text-sm">Scan PDF / Exam (AI) — Beta Version</span>
                  <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    Not working yet
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Direct OCR PDF scanning and automated questionnaire extraction is currently in beta development and not working yet. To import practice questions right now, please use the <strong className="text-primary font-semibold cursor-pointer hover:underline" onClick={() => setActiveTab("prompt_paste")}>AI Prompt & Paste</strong> tab (the first tab) to copy prompts into Gemini, DeepSeek, or ChatGPT and paste them into your question bank!
                </p>
                <div className="pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab("prompt_paste")}
                    className="h-7 text-xs font-semibold gap-1.5 text-primary border-primary/30 hover:bg-primary/10 cursor-pointer"
                  >
                    <Wand2 className="h-3.5 w-3.5" /> Switch to AI Prompt & Paste
                  </Button>
                </div>
              </div>
            </div>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200",
                isDragging
                  ? "border-primary bg-primary/10 scale-[0.99]"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
                selectedFile && "border-primary/40 bg-primary/5"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.docx,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />

              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  {selectedFile ? (
                    <FileCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <UploadCloud className="h-6 w-6" />
                  )}
                </div>
                {selectedFile ? (
                  <div>
                    <p className="font-semibold text-sm text-foreground">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(selectedFile.size / 1024).toFixed(1)} KB · Ready for AI scanning & solving
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-sm text-foreground">
                      Click to upload or drag & drop practice exam PDF
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Supports PDF reviewers, mock questionnaires, scanned pages, and test files
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-muted-foreground flex items-start gap-2.5">
              <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong className="text-foreground">Full Document Extraction & Solving:</strong> Our multi-chunk parallel engine parses all pages rapidly, generates verified answers with step-by-step solutions, and converts formulas into KaTeX ($F=ma$, $^{"{"}26{"}"}_{"{"}12{"}"}\text{"{"}Mg{"}"}$).
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="w-full sm:w-64 space-y-1">
                <Label className="text-xs text-muted-foreground">Subject Target</Label>
                <select
                  value={subjectHint}
                  onChange={(e) => setSubjectHint(e.target.value)}
                  className="w-full h-9 text-xs rounded-lg border border-input bg-background px-3 py-1 text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="auto">✨ Auto-Detect Subject</option>
                  {availableSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 w-full flex justify-end gap-2 pt-2 sm:pt-5">
                {selectedFile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      setExtractedQuestions([]);
                    }}
                    className="text-xs text-muted-foreground h-9 cursor-pointer"
                  >
                    Clear
                  </Button>
                )}
                <Button
                  type="button"
                  disabled={true}
                  className="font-semibold text-xs h-9 px-4 gap-2 bg-muted text-muted-foreground border border-border cursor-not-allowed w-full sm:w-auto opacity-75"
                  title="PDF scanning is currently in beta development and not working yet"
                >
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Beta · Not Working Yet
                </Button>
              </div>
            </div>

            {/* Live Progress */}
            {isScanning && scanProgress && (
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/25 space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                    <span>{scanProgress.status}</span>
                  </div>
                  <span className="text-primary font-bold">{scanProgress.percent}%</span>
                </div>
                <Progress value={scanProgress.percent} className="h-2 bg-primary/20" />
                {scanProgress.foundCount !== undefined && scanProgress.foundCount > 0 && (
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                    <span>
                      Detected <strong className="text-foreground">{scanProgress.foundCount}</strong> question{scanProgress.foundCount > 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>
            )}

            {scanError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{scanError}</span>
              </div>
            )}

            {/* Extracted Questions Preview */}
            {extractedQuestions.length > 0 && (
              <div className="space-y-4 pt-3 border-t">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-3 rounded-xl border">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <h4 className="font-bold text-sm text-foreground">
                        Extracted {extractedQuestions.length} Question{extractedQuestions.length > 1 ? "s" : ""}
                      </h4>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[11px] text-muted-foreground font-medium mr-1">Detected:</span>
                      {Object.entries(
                        extractedQuestions.reduce<Record<string, number>>((acc, q) => {
                          const name = SUBJECT_LABELS[q.subject] || q.subject;
                          acc[name] = (acc[name] || 0) + 1;
                          return acc;
                        }, {})
                      ).map(([subj, count]) => (
                        <Badge key={subj} variant="secondary" className="text-[10px] font-semibold py-0 px-2 h-5 bg-primary/10 text-primary border-primary/20">
                          {count} {subj}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs bg-background p-1 rounded-lg border">
                      <span className="text-[11px] text-muted-foreground pl-1.5 hidden sm:inline">Set All:</span>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            setAllExtractedSubject(e.target.value);
                          }
                        }}
                        defaultValue=""
                        className="h-7 text-xs rounded border-0 bg-transparent px-2 text-foreground focus:outline-none cursor-pointer"
                      >
                        <option value="" disabled>
                          Change All Subject...
                        </option>
                        {availableSubjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleCommitQuestions(extractedQuestions, "extracted")}
                      className="text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer h-8 shadow-sm"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add All to Question Bank
                    </Button>
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
                  {extractedQuestions.map((q, idx) => (
                    <div key={q.id || idx} className="p-3.5 rounded-xl border bg-card text-xs space-y-2.5 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                        <span className="font-bold text-muted-foreground text-xs">
                          Item #{idx + 1} {q.topic && <span className="font-normal text-muted-foreground/80">· {q.topic}</span>}
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Subject:</Label>
                          <select
                            value={q.subject}
                            onChange={(e) => updateExtractedSubject(idx, e.target.value)}
                            className="h-6 text-[11px] font-semibold rounded-md border border-input bg-background px-2 py-0 text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                          >
                            {availableSubjects.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <SmartText text={q.text} className="text-xs text-foreground font-medium" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-muted-foreground pt-1">
                        {q.choices.map((c) => (
                          <div
                            key={c.id}
                            className={cn(
                              "p-2 rounded-lg border text-xs",
                              c.id === q.correctAnswer
                                ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold"
                                : "bg-muted/30"
                            )}
                          >
                            <span className="font-bold mr-1.5">{c.id}.</span> {c.text}
                          </div>
                        ))}
                      </div>
                      {q.explanation && (
                        <p className="text-[11px] text-muted-foreground italic pt-1.5 border-t">
                          💡 <strong>Solution:</strong> {q.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {/* ─── TAB 5: BANNED / BLOCKED QUESTIONS LIST & RESET ─── */}
        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "banned" && (() => {
          const quizzedQs = getQuizzedRepeatBannedQuestions(universityId);
          const manualQs = getBannedQuestions(universityId);
          const totalBlocked = quizzedQs.length + manualQs.length;

          // Filter by search query
          const filteredQuizzed = quizzedQs.filter((q) => {
            if (!bannedSearch.trim()) return true;
            const searchLower = bannedSearch.toLowerCase();
            return (
              (q.text && q.text.toLowerCase().includes(searchLower)) ||
              (q.subject && q.subject.toLowerCase().includes(searchLower)) ||
              (q.topic && q.topic.toLowerCase().includes(searchLower))
            );
          });

          const filteredManual = manualQs.filter((q) => {
            if (!bannedSearch.trim()) return true;
            const searchLower = bannedSearch.toLowerCase();
            return (
              (q.text && q.text.toLowerCase().includes(searchLower)) ||
              (q.subject && q.subject.toLowerCase().includes(searchLower)) ||
              (q.topic && q.topic.toLowerCase().includes(searchLower))
            );
          });

          return (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-destructive/5 border border-destructive/15 text-xs text-muted-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🚫</span>
                  <div>
                    <span className="font-semibold text-foreground block">Repeat Ban & Past Quiz Memory</span>
                    <span className="text-[11px]">
                      Questions quizzed in past sessions are blocked from repeating in future quizzes. Unban questions here or reset session history for {universityId.toUpperCase()}.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] font-bold text-destructive border-destructive/30">
                    {totalBlocked} Banned / Quizzed Item{totalBlocked !== 1 ? "s" : ""}
                  </Badge>
                  {totalBlocked > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        unbanAllQuestions(universityId);
                        onQuestionsAdded();
                        setSuccessMessage("All questions have been unbanned! They can now appear in future quizzes.");
                        setTimeout(() => setSuccessMessage(null), 4000);
                      }}
                      className="h-7 text-xs font-semibold px-2.5 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Unban All ({totalBlocked})</span>
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      clearPastQuizHistory(universityId);
                      onQuestionsAdded();
                      setSuccessMessage("Past session history reset! All questions can now appear in new quizzes.");
                      setTimeout(() => setSuccessMessage(null), 4000);
                    }}
                    className="h-7 text-xs font-semibold px-2.5 gap-1.5 text-foreground hover:bg-muted cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Reset Past Sessions</span>
                  </Button>
                </div>
              </div>

              {/* Subtabs and Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 bg-muted/30 p-1 rounded-lg border w-fit">
                  <button
                    type="button"
                    onClick={() => setBannedSubTab("quizzed")}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer flex items-center gap-1.5",
                      bannedSubTab === "quizzed"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span>Quizzed in Past Sessions</span>
                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
                      {quizzedQs.length}
                    </Badge>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBannedSubTab("manual")}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer flex items-center gap-1.5",
                      bannedSubTab === "manual"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span>Manually Blocked</span>
                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
                      {manualQs.length}
                    </Badge>
                  </button>
                </div>

                <div className="relative max-w-xs w-full">
                  <Input
                    type="text"
                    placeholder="Search blocked questions..."
                    value={bannedSearch}
                    onChange={(e) => setBannedSearch(e.target.value)}
                    className="h-8 text-xs bg-background"
                  />
                  {bannedSearch && (
                    <button
                      onClick={() => setBannedSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Content by SubTab */}
              {bannedSubTab === "quizzed" && (
                <div>
                  {filteredQuizzed.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground bg-muted/10 rounded-xl border border-dashed space-y-3">
                      <span className="text-3xl block">🎈</span>
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          {quizzedQs.length === 0
                            ? "No repeat questions are currently banned from past sessions!"
                            : "No quizzed questions matched your search."}
                        </p>
                        <p className="text-[11px] text-muted-foreground/80 mt-1 max-w-md mx-auto">
                          When you complete quizzes and mock exams, tested questions are automatically tracked to prevent repetition.
                        </p>
                      </div>
                      {quizzedQs.length > 0 && (
                        <div className="pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              clearPastQuizHistory(universityId);
                              onQuestionsAdded();
                              setSuccessMessage("Past session question history reset!");
                              setTimeout(() => setSuccessMessage(null), 4000);
                            }}
                            className="h-7 text-xs font-semibold px-3 gap-1.5 cursor-pointer"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span>Reset Past Sessions History</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {filteredQuizzed.map((q, idx) => (
                        <div key={q.id || idx} className="p-4 rounded-xl border bg-card text-xs space-y-3 shadow-sm">
                          <div className="flex items-center justify-between border-b pb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-[10px] font-bold">
                                {SUBJECT_LABELS[q.subject || ""] || q.subject || "General"}
                              </Badge>
                              {q.topic && (
                                <span className="text-muted-foreground text-[10px]">· {q.topic}</span>
                              )}
                              <span className="text-[10px] text-muted-foreground/60 hidden sm:inline">
                                (Quizzed)
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                removePastQuizQuestion(q.id || q.text, universityId);
                                onQuestionsAdded();
                                setSuccessMessage("✓ Question unbanned! It can appear again in future quizzes.");
                                setTimeout(() => setSuccessMessage(null), 3000);
                              }}
                              className="h-6 text-[10px] px-2 text-emerald-600 dark:text-emerald-400 font-semibold hover:bg-emerald-500/10 cursor-pointer rounded-md bg-transparent border-0"
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Unban / Allow in Quiz
                            </Button>
                          </div>
                          <SmartText text={q.text} className="text-xs text-foreground font-medium" />
                          {q.choices && q.choices.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-muted-foreground pt-1">
                              {q.choices.map((c) => (
                                <div
                                  key={c.id}
                                  className={cn(
                                    "p-2 rounded-lg border text-xs",
                                    c.id === q.correctAnswer
                                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold"
                                      : "bg-muted/30"
                                  )}
                                >
                                  <span className="font-bold mr-1.5">{c.id}.</span> {c.text}
                                </div>
                              ))}
                            </div>
                          )}
                          {q.explanation && (
                            <p className="text-[11px] text-muted-foreground italic pt-1.5 border-t">
                              💡 <strong>Solution:</strong> {q.explanation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {bannedSubTab === "manual" && (
                <div>
                  {filteredManual.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground bg-muted/10 rounded-xl border border-dashed space-y-3">
                      <span className="text-3xl block">🎈</span>
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          {manualQs.length === 0
                            ? "No questions are manually blocked!"
                            : "No manually blocked questions matched your search."}
                        </p>
                        <p className="text-[11px] text-muted-foreground/80 mt-1 max-w-md mx-auto">
                          All questions in your question bank are eligible to appear in quizzes.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {filteredManual.map((q) => (
                        <div key={q.id} className="p-4 rounded-xl border bg-card text-xs space-y-3 shadow-sm">
                          <div className="flex items-center justify-between border-b pb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-[10px] font-bold">
                                {SUBJECT_LABELS[q.subject] || q.subject}
                              </Badge>
                              {q.topic && (
                                <span className="text-muted-foreground text-[10px]">· {q.topic}</span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                unbanQuestion(q.id, universityId);
                                onQuestionsAdded();
                                setSuccessMessage("✓ Manually blocked question restored!");
                                setTimeout(() => setSuccessMessage(null), 3000);
                              }}
                              className="h-6 text-[10px] px-2 text-red-600 dark:text-red-400 font-semibold hover:bg-red-500/10 cursor-pointer rounded-md bg-transparent border-0"
                            >
                              Restore Question
                            </Button>
                          </div>
                          <SmartText text={q.text} className="text-xs text-foreground font-medium" />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-muted-foreground pt-1">
                            {q.choices.map((c) => (
                              <div
                                key={c.id}
                                className={cn(
                                  "p-2 rounded-lg border text-xs",
                                  c.id === q.correctAnswer
                                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold"
                                    : "bg-muted/30"
                                )}
                              >
                                <span className="font-bold mr-1.5">{c.id}.</span> {c.text}
                              </div>
                            ))}
                          </div>
                          {q.explanation && (
                            <p className="text-[11px] text-muted-foreground italic pt-1.5 border-t">
                              💡 <strong>Solution:</strong> {q.explanation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
