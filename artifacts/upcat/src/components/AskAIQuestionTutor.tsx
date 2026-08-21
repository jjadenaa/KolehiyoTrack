import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SmartText } from "@/components/SmartText";
import { AICreditsBadge } from "@/components/AICreditsBadge";
import { checkCanUseAI, recordAIUsage, useAIQuota } from "@/lib/aiQuota";
import {
  Sparkles,
  Bot,
  Zap,
  HelpCircle,
  AlertTriangle,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  CheckCircle2,
  XCircle,
  MessageSquare,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SessionAnswer } from "@/types/session";

interface AskAIQuestionTutorProps {
  answer: SessionAnswer;
  questionNumber: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  errorAnalysis?: string;
  fastSolution?: string;
  keyRuleOrShortcut?: string;
}

export function AskAIQuestionTutor({ answer, questionNumber }: AskAIQuestionTutorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [queryInput, setQueryInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const quickPrompts = [
    {
      label: "Why is my answer wrong?",
      icon: AlertTriangle,
      prompt: `Why was my answer (${answer.selectedAnswer || "blank"}) incorrect, and what specific misconception or distractor trap did I fall into?`,
    },
    {
      label: "Fastest 30s Solution",
      icon: Zap,
      prompt: "What is the fastest and easiest shortcut, mental trick, or elimination method to solve this in under 30 seconds on exam day?",
    },
    {
      label: "How to avoid this trap",
      icon: HelpCircle,
      prompt: "What common test-maker traps exist for this concept, and what step-by-step check guarantees I avoid this error?",
    },
    {
      label: "Rule or formula to memorize",
      icon: BookOpen,
      prompt: "What is the exact formula, grammar rule, or 1-sentence mnemonic I should memorize for this topic?",
    },
  ];

  const handleAskAI = async (customPrompt?: string) => {
    const textToSend = customPrompt || queryInput.trim();
    if (!textToSend || isLoading) return;

    const quotaCheck = checkCanUseAI();
    if (!quotaCheck.allowed) {
      setErrorMessage(quotaCheck.reason || "Daily AI limit reached. Please wait a moment or try again tomorrow.");
      return;
    }

    setErrorMessage(null);
    setQueryInput("");

    // Add user message
    const userMsg: ChatMessage = { role: "user", content: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/gemini/explain-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionText: answer.questionText,
          choices: answer.choices,
          correctAnswer: answer.correctAnswer,
          userAnswer: answer.selectedAnswer,
          subject: answer.subject,
          explanation: answer.explanation,
          userQuery: textToSend,
        }),
      });

      let data: any = {};
      const responseText = await res.text();
      try {
        data = JSON.parse(responseText);
      } catch {
        if (!res.ok) {
          throw new Error(`The AI service is momentarily busy (Status ${res.status}). Please try again in a few moments.`);
        }
        throw new Error("Received an unexpected response format from the server. Please try again.");
      }

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to get AI explanation.");
      }

      recordAIUsage("error_explain");

      const aiMsg: ChatMessage = {
        role: "assistant",
        content: data.fullTutorResponse || "",
        errorAnalysis: data.errorAnalysis,
        fastSolution: data.fastSolution,
        keyRuleOrShortcut: data.keyRuleOrShortcut,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error("Error asking AI tutor:", err);
      setErrorMessage(err.message || "Failed to communicate with AI tutor. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-3 border-t pt-3">
      {!isOpen ? (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsOpen(true);
              if (messages.length === 0) {
                // Auto ask why wrong on first open
                handleAskAI(`Why was my answer (${answer.selectedAnswer || "blank"}) incorrect, and how do I solve it easily?`);
              }
            }}
            className={cn(
              "gap-2 text-xs font-semibold rounded-xl transition-all",
              !answer.isCorrect
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
                : "text-primary border-primary/20 hover:bg-primary/5"
            )}
          >
            <Bot className="h-4 w-4 text-amber-500" />
            <span>Ask AI: Why was I wrong & Fast Solution</span>
            <Sparkles className="h-3 w-3 text-amber-500" />
          </Button>

          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            Get instant error diagnosis & 30-second shortcuts
          </span>
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl bg-gradient-to-b from-primary/5 via-card to-card border-2 border-primary/20 p-4 animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm flex items-center gap-2">
                  AI Question Coach & Diagnostic
                  <Badge variant="outline" className="text-[10px] font-bold text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10">
                    Item #{questionNumber}
                  </Badge>
                </h4>
                <p className="text-xs text-muted-foreground">
                  Understand your mistake, eliminate distractors, and master fast shortcuts.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <AICreditsBadge compact />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick Prompt Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-muted-foreground mr-1">Quick Ask:</span>
            {quickPrompts.map((qp, idx) => {
              const Icon = qp.icon;
              return (
                <button
                  key={idx}
                  disabled={isLoading}
                  onClick={() => handleAskAI(qp.prompt)}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-background border hover:border-primary/50 hover:bg-primary/5 transition-colors flex items-center gap-1.5 disabled:opacity-50 text-foreground"
                >
                  <Icon className="h-3 w-3 text-amber-500" />
                  <span>{qp.label}</span>
                </button>
              );
            })}
          </div>

          {/* Messages stream */}
          <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
            {messages.map((msg, idx) => (
              <div key={idx} className="space-y-2">
                {msg.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="bg-primary text-primary-foreground text-xs rounded-2xl rounded-tr-sm px-3.5 py-2 max-w-[85%] font-medium">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Error Analysis Card */}
                    {msg.errorAnalysis && (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-bold">
                          <XCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>Why Answer {answer.selectedAnswer || "Blank"} Failed:</span>
                        </div>
                        <SmartText text={msg.errorAnalysis} className="text-muted-foreground leading-relaxed pl-5" />
                      </div>
                    )}

                    {/* Fast Solution Card */}
                    {msg.fastSolution && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold">
                          <Zap className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>Fast & Easy Solution / Shortcut:</span>
                        </div>
                        <SmartText text={msg.fastSolution} className="text-foreground leading-relaxed pl-5 font-medium" />
                      </div>
                    )}

                    {/* Cheat Sheet Mnemonic */}
                    {msg.keyRuleOrShortcut && (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs flex items-start gap-2">
                        <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-amber-800 dark:text-amber-200">Key Rule for Exam Day: </strong>
                          <span className="text-muted-foreground">{msg.keyRuleOrShortcut}</span>
                        </div>
                      </div>
                    )}

                    {/* Additional text if present */}
                    {!msg.fastSolution && msg.content && (
                      <div className="p-3 rounded-xl bg-background border text-xs leading-relaxed text-foreground">
                        <SmartText text={msg.content} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Isko AI is analyzing your answer and finding the fastest solution...</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                {errorMessage}
              </div>
            )}
          </div>

          {/* Interactive Chat Input */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Input
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAskAI();
                }
              }}
              placeholder="Ask a specific question (e.g. 'How do I solve this without formula?')"
              className="h-9 text-xs rounded-xl bg-background"
              disabled={isLoading}
            />
            <Button
              size="sm"
              onClick={() => handleAskAI()}
              disabled={!queryInput.trim() || isLoading}
              className="h-9 px-3.5 rounded-xl text-xs font-semibold gap-1.5 shrink-0 bg-primary hover:bg-primary/90"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Ask</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
