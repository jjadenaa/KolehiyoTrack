import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { addBankQuestions, deleteBankQuestion, BankQuestion } from "@/lib/questionBank";
import { SUBJECT_LABELS, getAvailableSubjectsForUniversity, getDefaultItemCounts } from "@/lib/format";
import { SmartText } from "@/components/SmartText";
import { AICreditsBadge } from "@/components/AICreditsBadge";
import { checkCanUseAI, recordAIUsage } from "@/lib/aiQuota";
import { extractTextFromPdfFile } from "@/lib/pdfExtractor";
import { buildAIPromptForUniversity } from "@/lib/promptCalibrations";
import {
  FileText,
  UploadCloud,
  Sparkles,
  Bot,
  CheckCircle2,
  AlertCircle,
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
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AIQuestionBankStudioProps {
  universityId: string;
  onQuestionsAdded: () => void;
  open?: boolean;
  onClose?: () => void;
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
}: AIQuestionBankStudioProps) {
  const [activeTab, setActiveTab] = useState<"pdf" | "manual" | "generate" | "prompt_paste">("pdf");

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
  // 4. PROMPT GENERATOR & PASTE STATE (OLD STYLE)
  // ─────────────────────────────────────────────────────────────────────────────
  const [promptSubTab, setPromptSubTab] = useState<"generate_prompt" | "paste_box">("paste_box");
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
      setGenSelectedSubjects(availableSubjects.reduce((acc, s) => ({ ...acc, [s.id]: false }), {}));
      setGenItemCounts(getDefaultItemCounts(universityId));
    }
  }, [universityId]);

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

      const res = await fetch("/api/gemini/extract-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
      setManualError("Question could not be added (duplicate ID).");
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
      const res = await fetch("/api/gemini/generate-subject-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: genSubject,
          universityId,
          topic: genTopic.trim() || undefined,
          count: genCount,
          difficulty: genDifficulty,
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
  // HELPERS FOR PROMPT GENERATOR & PASTE (OLD STYLE)
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
      // 1. Try JSON Array first
      const trimmed = textToParse.trim();
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const res = addBankQuestions(parsed, universityId);
          setPasteResult(res);
          onQuestionsAdded();
          setPasteText("");
          return;
        }
      }

      // 2. Parse plain text format
      const blocks = textToParse.split(/\n\s*---\s*\n|\n\s*={3,}\s*\n/);
      const valid: BankQuestion[] = [];

      for (let blockIdx = 0; blockIdx < blocks.length; blockIdx++) {
        const block = blocks[blockIdx].trim();
        if (!block) continue;

        let id = "";
        let subject = "";
        let topic = "";
        let passage = "";
        let question = "";
        let correctAnswer = "";
        let explanation = "";
        const choices: { id: string; text: string }[] = [];

        const lines = block.split("\n");
        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line) continue;

          if (/^ID\s*:/i.test(line)) {
            id = line.replace(/^ID\s*:/i, "").trim();
          } else if (/^SUBJECT\s*:/i.test(line)) {
            subject = line.replace(/^SUBJECT\s*:/i, "").trim();
          } else if (/^TOPIC\s*:/i.test(line)) {
            topic = line.replace(/^TOPIC\s*:/i, "").trim();
          } else if (/^PASSAGE\s*:/i.test(line)) {
            passage = line.replace(/^PASSAGE\s*:/i, "").trim();
          } else if (/^QUESTION\s*:/i.test(line)) {
            question = line.replace(/^QUESTION\s*:/i, "").trim();
          } else if (/^[A-D]\s*[\)\.\:]\s*/i.test(line)) {
            const letter = line[0].toUpperCase();
            const text = line.replace(/^[A-D]\s*[\)\.\:]\s*/i, "").trim();
            choices.push({ id: letter, text });
          } else if (/^CORRECT\s*(?:ANSWER)?\s*:/i.test(line)) {
            correctAnswer = line.replace(/^CORRECT\s*(?:ANSWER)?\s*:/i, "").trim();
          } else if (/^EXPLANATION\s*:/i.test(line)) {
            explanation = line.replace(/^EXPLANATION\s*:/i, "").trim();
          }
        }

        if (!question && !passage) continue;
        if (choices.length < 2) continue;

        if (!id) {
          id = `q_custom_${Date.now()}_${blockIdx}_${Math.floor(Math.random() * 1000)}`;
        }

        let fullText = question;
        if (passage && question) fullText = `PASSAGE:\n${passage}\n\nQUESTION: ${question}`;
        else if (passage) fullText = `PASSAGE:\n${passage}`;

        // Normalize subject
        const normalizedSubj = subject.toLowerCase().replace(/\s+/g, "_") || availableSubjects[0]?.id || "science";

        valid.push({
          id,
          subject: normalizedSubj,
          topic: topic || undefined,
          text: fullText,
          choices,
          correctAnswer: (correctAnswer || choices[0]?.id || "A").toUpperCase(),
          explanation: explanation || "",
        });
      }

      if (valid.length === 0) {
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

    setSuccessMessage(
      `Successfully added ${result.added} question${result.added !== 1 ? "s" : ""} (${breakdownText}) to your ${universityId.toUpperCase()} bank!${result.skipped > 0 ? ` (${result.skipped} duplicates skipped)` : ""}`
    );

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
          <AICreditsBadge compact />
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

      {/* ─── TAB NAVIGATION BAR ─── */}
      <div className="flex border-b bg-muted/10 px-4 pt-1 overflow-x-auto no-scrollbar shrink-0">
        <button
          onClick={() => setActiveTab("pdf")}
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer",
            activeTab === "pdf"
              ? "border-primary text-primary bg-primary/5 rounded-t-lg"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
          )}
        >
          <FileText className="h-4 w-4" />
          <span>Scan PDF / Exam (AI)</span>
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
          <span>Manual Question Entry</span>
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
          <span>AI Generate by Subject</span>
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
          <Wand2 className="h-4 w-4 text-blue-500" />
          <span>AI Prompt & Paste (Old Style)</span>
        </button>
      </div>

      {/* ─── MODAL BODY / SCROLLABLE CONTENT ─── */}
      <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-medium flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {/* ─── TAB 1: PDF SCAN & AUTO SOLVE (AI) ─── */}
        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "pdf" && (
          <div className="space-y-4">
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
                  onClick={handleScanPdf}
                  disabled={!selectedFile || isScanning}
                  className="font-semibold text-xs h-9 px-4 gap-2 bg-primary hover:bg-primary/90 w-full sm:w-auto cursor-pointer"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Scanning & Solving Questions...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-amber-400" />
                      Scan & Extract Questions
                    </>
                  )}
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
        {/* ─── TAB 2: MANUAL QUESTION ENTRY ─── */}
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
        {/* ─── TAB 4: PROMPT GENERATOR & PASTE (OLD STYLE) ─── */}
        {/* ═════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "prompt_paste" && (
          <div className="space-y-4">
            <div className="flex border-b bg-muted/20 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setPromptSubTab("generate_prompt")}
                className={cn(
                  "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                  promptSubTab === "generate_prompt"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                1. Generate AI Prompt (Gemini / DeepSeek)
              </button>
              <button
                type="button"
                onClick={() => setPromptSubTab("paste_box")}
                className={cn(
                  "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                  promptSubTab === "paste_box"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                2. Paste Questions or Upload File
              </button>
            </div>

            {promptSubTab === "generate_prompt" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <Label className="text-xs font-semibold">Select subjects & question quantities:</Label>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setGenSelectedSubjects(
                            availableSubjects.reduce((acc, s) => ({ ...acc, [s.id]: true }), {})
                          )
                        }
                        className="h-6 text-[11px] px-2.5 font-semibold text-primary border-primary/30 hover:bg-primary/10 cursor-pointer"
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setGenSelectedSubjects(
                            availableSubjects.reduce((acc, s) => ({ ...acc, [s.id]: false }), {})
                          )
                        }
                        className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Deselect All
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {availableSubjects.map((s) => {
                      const isSelected = !!genSelectedSubjects[s.id];
                      return (
                        <div
                          key={s.id}
                          className={cn(
                            "flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors",
                            isSelected ? "bg-card border-primary/30" : "bg-muted/20 opacity-60"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) =>
                                setGenSelectedSubjects((prev) => ({ ...prev, [s.id]: !!checked }))
                              }
                            />
                            <span className="font-semibold">{s.label}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <DirectNumberInput
                              value={genItemCounts[s.id] ?? 10}
                              disabled={!isSelected}
                              min={1}
                              max={200}
                              onChange={(val) =>
                                setGenItemCounts((prev) => ({
                                  ...prev,
                                  [s.id]: val,
                                }))
                              }
                            />
                            <span className="text-[11px] text-muted-foreground">items</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Button onClick={buildPrompt} className="w-full gap-2 text-xs font-semibold h-9">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  Generate Prompt for External AI Chatbot
                </Button>

                {generatedPrompt && (
                  <div className="space-y-2.5 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Custom Generated Prompt</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={copyPrompt}
                        className="gap-1.5 h-7 text-xs cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copy Prompt
                          </>
                        )}
                      </Button>
                    </div>

                    <textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      className="w-full h-36 rounded-xl border bg-muted/30 p-3 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                    />

                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-muted-foreground space-y-1">
                      <p className="font-semibold text-foreground">How to use:</p>
                      <p>1. Click <strong>Copy Prompt</strong> above.</p>
                      <p>2. Open <a href="https://gemini.google.com" target="_blank" rel="noreferrer" className="text-primary underline">Google Gemini</a> or <a href="https://chat.deepseek.com" target="_blank" rel="noreferrer" className="text-primary underline">DeepSeek</a> and paste it.</p>
                      <p>3. Copy the output questions from the AI, switch to the <strong>Paste Questions</strong> tab, and paste them to save!</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {promptSubTab === "paste_box" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-xs font-semibold">
                    Paste formatted questions or JSON array:
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => pasteFileInputRef.current?.click()}
                    className="h-7 text-xs gap-1.5 cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Upload .json / .txt
                  </Button>
                  <input
                    ref={pasteFileInputRef}
                    type="file"
                    accept=".json,.txt,application/json,text/plain"
                    className="hidden"
                    onChange={handlePasteFileUpload}
                  />
                </div>

                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={`ID: q1\nSUBJECT: math\nTOPIC: Algebra\nQUESTION: Solve for x: $2x + 8 = 20$\nA) 4\nB) 6\nC) 8\nD) 10\nCORRECT: B\nEXPLANATION: Subtract 8 from both sides: 2x = 12 -> x = 6.\n\n---\n\nOr paste JSON: [{"id":"q1","subject":"math","text":"...","choices":[{"id":"A","text":"..."},...],"correctAnswer":"A"}]`}
                  rows={8}
                  className="w-full text-xs font-mono rounded-xl border bg-background p-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                />

                {pasteError && (
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{pasteError}</span>
                  </div>
                )}

                {pasteResult && (
                  <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      Successfully added {pasteResult.added} question{pasteResult.added !== 1 ? "s" : ""}!
                      {pasteResult.skipped > 0 && ` (${pasteResult.skipped} duplicates skipped)`}
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
                    Save Questions to Bank
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
