import { useState, useEffect, useCallback, useMemo } from "react";
import { MistakeItem, updateMistakeStatus } from "@/lib/mistakeDiary";
import { useAuth } from "@/context/AuthContext";
import { SUBJECT_LABELS } from "@/lib/format";
import { SmartText } from "@/components/SmartText";
import { DiagramRenderer } from "@/components/DiagramRenderer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import {
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Shuffle,
  Volume2,
  Check,
  Award,
  BookOpen,
  Eye,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FlashcardDeckProps {
  mistakes: MistakeItem[];
  universityId?: string;
  onMistakesUpdated?: () => void;
  onStartQuiz?: () => void;
}

export function FlashcardDeck({
  mistakes,
  universityId = "upcat",
  onMistakesUpdated,
  onStartQuiz,
}: FlashcardDeckProps) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedPreviewChoice, setSelectedPreviewChoice] = useState<string | null>(null);
  const [deck, setDeck] = useState<MistakeItem[]>(mistakes);
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [showCelebration, setShowCelebration] = useState(false);

  // Sync deck when mistakes or subject filter change
  useEffect(() => {
    let filtered = mistakes;
    if (subjectFilter !== "all") {
      filtered = mistakes.filter((m) => m.subject === subjectFilter);
    }
    setDeck(filtered);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSelectedPreviewChoice(null);
  }, [mistakes, subjectFilter]);

  const currentCard = deck[currentIndex];

  const handleNext = useCallback(() => {
    if (currentIndex < deck.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
      setSelectedPreviewChoice(null);
    } else if (deck.length > 0) {
      setShowCelebration(true);
    }
  }, [currentIndex, deck.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsFlipped(false);
      setSelectedPreviewChoice(null);
    }
  }, [currentIndex]);

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleShuffle = () => {
    const shuffled = [...deck].sort(() => 0.5 - Math.random());
    setDeck(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSelectedPreviewChoice(null);
  };

  const handleRate = async (status: "needs_review" | "practicing" | "mastered") => {
    if (!currentCard) return;
    await updateMistakeStatus(currentCard.id, status, universityId, user?.uid);
    if (onMistakesUpdated) onMistakesUpdated();

    // Optimistically update card in local deck
    setDeck((prev) =>
      prev.map((c, i) =>
        i === currentIndex
          ? { ...c, status, masteryScore: status === "mastered" ? 100 : status === "practicing" ? 50 : 0 }
          : c
      )
    );

    // Auto advance
    setTimeout(() => {
      handleNext();
    }, 250);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        handleFlip();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (isFlipped) {
        if (e.key === "1") handleRate("needs_review");
        if (e.key === "2") handleRate("practicing");
        if (e.key === "3") handleRate("mastered");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleFlip, handleNext, handlePrev, isFlipped, currentCard]);

  const masteredCount = useMemo(
    () => deck.filter((m) => m.status === "mastered").length,
    [deck]
  );
  const masteryPercentage = deck.length > 0 ? Math.round((masteredCount / deck.length) * 100) : 0;

  const subjects = useMemo(() => {
    const set = new Set(mistakes.map((m) => m.subject));
    return Array.from(set);
  }, [mistakes]);

  if (mistakes.length === 0) {
    return (
      <Card className="border border-border/80 bg-card/60 backdrop-blur-sm text-center p-8 sm:p-12 shadow-sm rounded-xl">
        <div className="max-w-md mx-auto space-y-4">
          <div className="h-16 w-16 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto ring-8 ring-emerald-500/5">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-foreground">Mistake Diary is Clean!</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You don't have any logged mistakes yet. When you take mock exams or practice quizzes, any questions you miss will automatically appear here as interactive flashcards.
          </p>
          {onStartQuiz && (
            <Button onClick={onStartQuiz} className="gap-2 mt-2 font-semibold">
              <Sparkles className="h-4 w-4" />
              Take a Practice Test
            </Button>
          )}
        </div>
      </Card>
    );
  }

  if (deck.length === 0) {
    return (
      <Card className="border border-border p-8 text-center rounded-xl">
        <p className="text-muted-foreground">No mistakes found for this subject filter.</p>
        <Button variant="outline" size="sm" onClick={() => setSubjectFilter("all")} className="mt-3">
          Show All Subjects
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Filter & Deck Stats Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/40 p-3.5 sm:p-4 rounded-xl border border-border/70">
        <div className="flex items-center flex-wrap gap-1.5">
          <Button
            variant={subjectFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSubjectFilter("all")}
            className="h-8 text-xs font-semibold rounded-lg"
          >
            All Subjects ({mistakes.length})
          </Button>
          {subjects.map((sub) => (
            <Button
              key={sub}
              variant={subjectFilter === sub ? "default" : "outline"}
              size="sm"
              onClick={() => setSubjectFilter(sub)}
              className="h-8 text-xs font-semibold rounded-lg capitalize"
            >
              {SUBJECT_LABELS[sub] || sub} ({mistakes.filter((m) => m.subject === sub).length})
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="font-semibold text-foreground">{masteredCount}</span> / {deck.length} Mastered
            <span className="text-emerald-600 font-bold ml-1">({masteryPercentage}%)</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShuffle}
            title="Shuffle deck"
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Shuffle className="h-3.5 w-3.5 mr-1" />
            Shuffle
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-medium text-muted-foreground">
          <span>
            Card <strong className="text-foreground">{currentIndex + 1}</strong> of {deck.length}
          </span>
          <span className="capitalize text-xs font-semibold px-2 py-0.5 rounded bg-muted">
            Status:{" "}
            {currentCard?.status === "mastered"
              ? "🟢 Mastered"
              : currentCard?.status === "practicing"
              ? "🟡 Practicing"
              : "🔴 Needs Review"}
          </span>
        </div>
        <Progress value={((currentIndex + 1) / deck.length) * 100} className="h-2 rounded-full" />
      </div>

      {/* Interactive 3D Flip Card Container */}
      <div className="relative min-h-[360px] sm:min-h-[400px] w-full [perspective:1200px]">
        <div
          onClick={handleFlip}
          className={cn(
            "w-full min-h-[360px] sm:min-h-[400px] rounded-2xl border-2 transition-all duration-500 cursor-pointer shadow-lg relative flex flex-col justify-between p-5 sm:p-7 select-none group",
            isFlipped
              ? "bg-card border-primary/40 shadow-primary/10 ring-1 ring-primary/20"
              : "bg-card hover:border-primary/30 border-border hover:shadow-xl"
          )}
        >
          {/* Card Header Tag / Badges */}
          <div className="flex items-center justify-between gap-2 border-b pb-3.5 border-border/70">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="font-semibold text-xs bg-primary/10 text-primary border-primary/20">
                {SUBJECT_LABELS[currentCard?.subject] || currentCard?.subject}
              </Badge>
              {currentCard?.topic && (
                <Badge variant="outline" className="text-xs text-muted-foreground capitalize">
                  {currentCard.topic.replace(/_/g, " ")}
                </Badge>
              )}
              {currentCard?.missCount > 1 && (
                <Badge variant="destructive" className="text-[11px] font-bold px-2 py-0">
                  Missed {currentCard.missCount}x
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium group-hover:text-primary transition-colors">
              <Eye className="h-3.5 w-3.5" />
              <span>{isFlipped ? "Viewing Solution (Click to flip)" : "Click or [Space] to flip"}</span>
            </div>
          </div>

          {/* FRONT CONTENT */}
          {!isFlipped && (
            <div className="my-auto py-4 space-y-4">
              <div className="text-base sm:text-lg font-medium text-foreground leading-relaxed">
                <SmartText text={currentCard?.questionText || ""} />
              </div>

              {currentCard?.diagram && (
                <div className="my-3 p-2 bg-muted/20 rounded-lg border border-border/50">
                  <DiagramRenderer diagram={currentCard.diagram} />
                </div>
              )}

              {/* Interactive choice tester on front (optional preview) */}
              {currentCard?.choices && currentCard.choices.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {currentCard.choices.map((choice) => (
                    <button
                      key={choice.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPreviewChoice(choice.id);
                      }}
                      className={cn(
                        "p-3 rounded-xl border text-left text-xs sm:text-sm font-medium transition-all flex items-start gap-2.5",
                        selectedPreviewChoice === choice.id
                          ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                          : "border-border/80 bg-muted/20 hover:bg-muted/50"
                      )}
                    >
                      <span className="font-bold shrink-0 h-5 w-5 rounded-full bg-background border flex items-center justify-center text-xs">
                        {choice.id}
                      </span>
                      <span className="leading-snug break-words flex-1">{choice.text}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* BACK CONTENT (Solution & Breakdown) */}
          {isFlipped && (
            <div className="my-auto py-4 space-y-4 animate-in fade-in zoom-in-95 duration-300">
              {/* Correct Answer Banner */}
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    ✓
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
                      Correct Answer
                    </span>
                    <span className="text-base sm:text-lg font-bold text-emerald-950 dark:text-emerald-100">
                      Option {currentCard?.correctAnswer}
                      {currentCard?.choices?.find((c) => c.id === currentCard.correctAnswer) && (
                        <span className="ml-2 font-normal text-sm opacity-90">
                          — {currentCard.choices.find((c) => c.id === currentCard.correctAnswer)?.text}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* What was previously picked */}
              {currentCard?.selectedAnswer && currentCard.selectedAnswer !== currentCard.correctAnswer && (
                <div className="px-3.5 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-800 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>
                    Your previous mock exam choice: <strong>Option {currentCard.selectedAnswer}</strong> (Common distractor trap)
                  </span>
                </div>
              )}

              {/* Step-by-step Explanation */}
              <div className="space-y-1.5 text-sm sm:text-base bg-muted/30 p-4 rounded-xl border border-border/60">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Explanation & Rationale
                </div>
                <div className="text-foreground leading-relaxed">
                  <SmartText text={currentCard?.explanation || "No explanation recorded for this question."} />
                </div>
              </div>
            </div>
          )}

          {/* Card Footer / Rate buttons */}
          <div
            className="border-t pt-3.5 border-border/70 flex flex-col sm:flex-row items-center justify-between gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            {!isFlipped ? (
              <div className="w-full flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="gap-1.5 h-9 rounded-lg"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Prev
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  onClick={handleFlip}
                  className="gap-1.5 h-9 px-5 font-semibold rounded-lg bg-primary hover:bg-primary/90"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reveal Solution
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={currentIndex === deck.length - 1}
                  className="gap-1.5 h-9 rounded-lg"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <span className="text-xs font-semibold text-muted-foreground">Rate your recall:</span>
                <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRate("needs_review")}
                    className="h-8 sm:h-9 text-xs font-bold border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                  >
                    🔴 Still Learning [1]
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRate("practicing")}
                    className="h-8 sm:h-9 text-xs font-bold border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg"
                  >
                    🟡 Almost [2]
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRate("mastered")}
                    className="h-8 sm:h-9 text-xs font-bold border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg"
                  >
                    🟢 Mastered! [3]
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Deck Controls (Bottom Action Bar) */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="gap-2 font-medium rounded-xl"
        >
          <ArrowLeft className="h-4 w-4" />
          Previous Card
        </Button>

        <div className="text-xs text-muted-foreground hidden sm:block">
          Use <kbd className="px-1.5 py-0.5 bg-muted rounded border text-[10px]">Space</kbd> to flip,{" "}
          <kbd className="px-1.5 py-0.5 bg-muted rounded border text-[10px]">←</kbd>{" "}
          <kbd className="px-1.5 py-0.5 bg-muted rounded border text-[10px]">→</kbd> to navigate
        </div>

        <Button
          variant="outline"
          onClick={handleNext}
          disabled={currentIndex === deck.length - 1}
          className="gap-2 font-medium rounded-xl"
        >
          Next Card
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Deck Completion Modal / Banner */}
      {showCelebration && (
        <Card className="border-2 border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-6 rounded-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-500">
          <div className="h-14 w-14 bg-emerald-500/20 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <Award className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xl font-bold text-foreground">Flashcard Review Completed!</h4>
            <p className="text-sm text-muted-foreground">
              You reviewed all {deck.length} cards in this deck. You've mastered {masteredCount} of them (
              {masteryPercentage}%).
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setCurrentIndex(0);
                setShowCelebration(false);
                setIsFlipped(false);
              }}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Review Deck Again
            </Button>
            {onStartQuiz && (
              <Button onClick={onStartQuiz} className="gap-2 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white">
                <Sparkles className="h-4 w-4" />
                Take Follow-up Quiz Now
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
