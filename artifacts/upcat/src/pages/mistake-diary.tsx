import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useTest } from "@/context/TestContext";
import {
  MistakeItem,
  getLocalMistakes,
  syncMistakesWithFirestore,
  updateMistakeStatus,
  removeMistake,
  clearMasteredMistakes,
} from "@/lib/mistakeDiary";
import { generateTargetedQuiz } from "@/lib/mistakeQuizGenerator";
import { SUBJECT_LABELS, formatTime, calcTotalSeconds, getSecondsPerItem } from "@/lib/format";
import { Layout } from "@/components/layout";
import { FlashcardDeck } from "@/components/FlashcardDeck";
import { SmartText } from "@/components/SmartText";
import { DiagramRenderer } from "@/components/DiagramRenderer";
import { AICreditsBadge } from "@/components/AICreditsBadge";
import { checkCanUseAI, recordAIUsage } from "@/lib/aiQuota";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Search,
  Trash2,
  ArrowRight,
  PlayCircle,
  BrainCircuit,
  Filter,
  Check,
  HelpCircle,
  Plus,
  Loader2,
  GraduationCap,
  Layers,
  ListFilter,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function MistakeDiaryPage() {
  const { user } = useAuth();
  const { universityId, setQuestions, setAnswers, setTimeRemaining, setStatus } = useTest();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [mistakes, setMistakes] = useState<MistakeItem[]>(() => getLocalMistakes(universityId || "upcat"));
  const [activeTab, setActiveTab] = useState<"flashcards" | "quiz" | "list">("flashcards");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "needs_review" | "practicing" | "mastered">("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [expandedMistakeId, setExpandedMistakeId] = useState<string | null>(null);

  // Quiz config state
  const [quizMode, setQuizMode] = useState<"retake" | "ai_generated">("retake");
  const [quizCount, setQuizCount] = useState<number>(5);
  const [quizSubject, setQuizSubject] = useState<string>("all");
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState<boolean>(false);

  // Load and sync mistakes
  const refreshMistakes = useCallback(async () => {
    const local = getLocalMistakes(universityId || "upcat");
    setMistakes(local);

    if (user) {
      try {
        const synced = await syncMistakesWithFirestore(user.uid, universityId || "upcat");
        setMistakes(synced);
      } catch (err) {
        console.error("Firestore sync error:", err);
      }
    }
  }, [user, universityId]);

  useEffect(() => {
    refreshMistakes();

    const handleCustomUpdate = () => {
      refreshMistakes();
    };

    window.addEventListener("kolehiyotrack_mistakes_updated", handleCustomUpdate);
    return () => window.removeEventListener("kolehiyotrack_mistakes_updated", handleCustomUpdate);
  }, [refreshMistakes]);

  // Summary Metrics
  const totalCount = mistakes.length;
  const masteredCount = useMemo(() => mistakes.filter((m) => m.status === "mastered").length, [mistakes]);
  const needsReviewCount = useMemo(() => mistakes.filter((m) => m.status === "needs_review").length, [mistakes]);
  const practicingCount = useMemo(() => mistakes.filter((m) => m.status === "practicing").length, [mistakes]);
  const masteryPercentage = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;

  // Weakest Subject
  const weakestSubject = useMemo(() => {
    if (mistakes.length === 0) return null;
    const counts: Record<string, number> = {};
    mistakes.forEach((m) => {
      counts[m.subject] = (counts[m.subject] || 0) + 1;
    });
    let topSub = "";
    let topCount = 0;
    for (const [sub, cnt] of Object.entries(counts)) {
      if (cnt > topCount) {
        topCount = cnt;
        topSub = sub;
      }
    }
    return { subject: topSub, count: topCount };
  }, [mistakes]);

  // Filtered Mistakes List
  const filteredMistakes = useMemo(() => {
    return mistakes.filter((m) => {
      const matchesSearch =
        searchQuery === "" ||
        m.questionText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.topic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.subject.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || m.status === statusFilter;
      const matchesSubject = subjectFilter === "all" || m.subject === subjectFilter;

      return matchesSearch && matchesStatus && matchesSubject;
    });
  }, [mistakes, searchQuery, statusFilter, subjectFilter]);

  // Launch Follow-Up Quiz Handler
  const handleLaunchQuiz = async () => {
    if (mistakes.length === 0) {
      toast({
        title: "No mistakes in diary",
        description: "Take some practice tests first to record questions you'd like to reinforce.",
        variant: "destructive",
      });
      return;
    }

    if (quizMode === "ai_generated") {
      const quotaCheck = checkCanUseAI();
      if (!quotaCheck.allowed) {
        toast({
          title: "AI Daily Limit Reached",
          description: quotaCheck.reason || "Daily quota reached. You can still use 'Direct Retake' mode anytime without limits!",
          variant: "destructive",
        });
        return;
      }
    }

    setIsGeneratingQuiz(true);
    try {
      const generatedQuestions = await generateTargetedQuiz(mistakes, {
        mode: quizMode,
        count: quizCount,
        subject: quizSubject,
        universityId: universityId || "upcat",
      });

      if (!generatedQuestions || generatedQuestions.length === 0) {
        throw new Error("No questions were generated.");
      }

      if (quizMode === "ai_generated") {
        recordAIUsage("mistake_quiz");
      }

      // Calculate time for this targeted quiz based on question count and subjects
      const totalSecs = generatedQuestions.reduce(
        (sum, q) => sum + getSecondsPerItem(q.subject, universityId || "upcat"),
        0
      );

      // Set TestContext and launch test
      setQuestions(generatedQuestions);
      setAnswers({});
      setTimeRemaining(totalSecs);
      setStatus("running");

      toast({
        title: quizMode === "ai_generated" ? "⚡ AI Follow-Up Quiz Ready!" : "🎯 Retake Quiz Ready!",
        description: `Starting a ${generatedQuestions.length}-question targeted practice session.`,
      });

      setLocation("/test");
    } catch (err: any) {
      console.error("Quiz launch error:", err);
      toast({
        title: "Quiz generation failed",
        description: err.message || "Please check your network and try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleClearMastered = async () => {
    if (confirm("Are you sure you want to remove all mastered questions from your Mistake Diary?")) {
      const updated = await clearMasteredMistakes(universityId || "upcat", user?.uid);
      setMistakes(updated);
      toast({
        title: "Cleared Mastered Items",
        description: "Your diary now only shows active items needing review.",
      });
    }
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto w-full space-y-6 pb-16 animate-in fade-in duration-500">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-xs">
                <BrainCircuit className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">AI Error Log & Mistake Diary</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Automatically catalogs every missed question from your mock exams into interactive flashcards and targeted quizzes.
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab("quiz")}
              className="gap-1.5 h-9 font-semibold rounded-lg flex-1 sm:flex-none"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              Targeted Quiz
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setActiveTab("flashcards")}
              className="gap-1.5 h-9 font-semibold rounded-lg bg-primary hover:bg-primary/90 flex-1 sm:flex-none"
            >
              <Layers className="h-4 w-4" />
              Study Deck
            </Button>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <Card className="p-4 border bg-card shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Logged</span>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">{totalCount}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Missed exam questions</div>
          </Card>

          <Card className="p-4 border bg-card shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Needs Review</span>
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-2">{needsReviewCount}</div>
            <div className="text-xs text-muted-foreground mt-0.5">High-priority items</div>
          </Card>

          <Card className="p-4 border bg-card shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Mastered</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">{masteredCount}</div>
            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <span>{masteryPercentage}% overall</span>
              <Progress value={masteryPercentage} className="h-1.5 w-14 inline-block" />
            </div>
          </Card>

          <Card className="p-4 border bg-card shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Top Blindspot</span>
              <Flame className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-foreground mt-2 truncate capitalize">
              {weakestSubject ? SUBJECT_LABELS[weakestSubject.subject] || weakestSubject.subject : "None"}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {weakestSubject ? `${weakestSubject.count} missed items` : "All areas look solid"}
            </div>
          </Card>
        </div>

        {/* Main Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto p-1 bg-muted rounded-xl">
            <TabsTrigger value="flashcards" className="gap-2 font-semibold text-xs sm:text-sm rounded-lg">
              <Layers className="h-4 w-4" />
              Flashcards
            </TabsTrigger>
            <TabsTrigger value="quiz" className="gap-2 font-semibold text-xs sm:text-sm rounded-lg">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Follow-up Quiz
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2 font-semibold text-xs sm:text-sm rounded-lg">
              <ListFilter className="h-4 w-4" />
              Error Log ({totalCount})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: FLASHCARD DECK */}
          <TabsContent value="flashcards" className="space-y-4">
            <FlashcardDeck
              mistakes={mistakes}
              universityId={universityId || "upcat"}
              onMistakesUpdated={refreshMistakes}
              onStartQuiz={() => setActiveTab("quiz")}
            />
          </TabsContent>

          {/* TAB 2: TARGETED FOLLOW-UP QUIZ */}
          <TabsContent value="quiz" className="space-y-6">
            <Card className="border-border shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-muted/20 border-b pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                      <Sparkles className="h-5 w-5 animate-pulse" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold">Targeted Follow-Up Quiz</CardTitle>
                      <CardDescription>
                        Reinforce weak concepts with customized practice tests specifically targeting your missed questions.
                      </CardDescription>
                    </div>
                  </div>
                  <AICreditsBadge compact />
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Quiz Mode Selector */}
                <div className="space-y-3">
                  <Label className="text-sm font-bold">Choose Quiz Mode</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div
                      onClick={() => setQuizMode("retake")}
                      className={cn(
                        "p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3.5",
                        quizMode === "retake"
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border hover:border-muted-foreground/40 bg-card"
                      )}
                    >
                      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                        <RotateCcw className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-foreground">Missed Items Retake Quiz</h4>
                          <Badge variant="outline" className="text-[10px] uppercase font-bold">
                            Direct
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Directly tests the exact questions you answered incorrectly to verify you now understand the correct solutions.
                        </p>
                      </div>
                    </div>

                    <div
                      onClick={() => setQuizMode("ai_generated")}
                      className={cn(
                        "p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3.5",
                        quizMode === "ai_generated"
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border hover:border-muted-foreground/40 bg-card"
                      )}
                    >
                      <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-foreground">AI Concept Reinforcement</h4>
                          <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] uppercase font-bold">
                            Gemini AI
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Generates fresh, brand-new practice questions specifically targeting the exact rules, formulas, and concepts behind your mistakes.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Question Count & Subject Filter */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Number of Questions</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {[3, 5, 10, Math.min(15, Math.max(1, totalCount))].map((num) => (
                        <Button
                          key={num}
                          type="button"
                          variant={quizCount === num ? "default" : "outline"}
                          size="sm"
                          onClick={() => setQuizCount(num)}
                          className="font-bold text-xs h-9"
                        >
                          {num} Items
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Target Subject</Label>
                    <select
                      value={quizSubject}
                      onChange={(e) => setQuizSubject(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                    >
                      <option value="all">All Missed Subjects</option>
                      <option value="math">Mathematics ({mistakes.filter((m) => m.subject === "math").length})</option>
                      <option value="science">Science ({mistakes.filter((m) => m.subject === "science").length})</option>
                      <option value="language_english">
                        Language Proficiency (English) ({mistakes.filter((m) => m.subject === "language_english").length})
                      </option>
                      <option value="language_filipino">
                        Language Proficiency (Filipino) ({mistakes.filter((m) => m.subject === "language_filipino").length})
                      </option>
                      <option value="reading_english">
                        Reading Comprehension (English) ({mistakes.filter((m) => m.subject === "reading_english").length})
                      </option>
                      <option value="reading_filipino">
                        Reading Comprehension (Filipino) ({mistakes.filter((m) => m.subject === "reading_filipino").length})
                      </option>
                    </select>
                  </div>
                </div>

                {/* Launch Button */}
                <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-muted-foreground">
                    Estimated test duration: <strong>{quizCount * 1.5} minutes</strong> with real-time scoring.
                  </div>
                  <Button
                    size="lg"
                    disabled={isGeneratingQuiz || totalCount === 0}
                    onClick={handleLaunchQuiz}
                    className="w-full sm:w-auto gap-2 font-bold px-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                  >
                    {isGeneratingQuiz ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating Follow-Up Quiz...
                      </>
                    ) : (
                      <>
                        <PlayCircle className="h-5 w-5" />
                        Start Targeted Quiz ({quizCount} Questions)
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: MISTAKE ERROR LOG LIST */}
          <TabsContent value="list" className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/30 p-3.5 rounded-xl border">
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search questions, topics, or formulas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs bg-background rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <select
                  value={statusFilter}
                  onChange={(e: any) => setStatusFilter(e.target.value)}
                  className="h-9 px-2.5 rounded-lg border bg-background text-xs font-semibold focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="needs_review">Needs Review</option>
                  <option value="practicing">Practicing</option>
                  <option value="mastered">Mastered</option>
                </select>

                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="h-9 px-2.5 rounded-lg border bg-background text-xs font-semibold focus:outline-none"
                >
                  <option value="all">All Subjects</option>
                  <option value="math">Math</option>
                  <option value="science">Science</option>
                  <option value="language_english">English</option>
                  <option value="language_filipino">Filipino</option>
                  <option value="reading_english">Reading (EN)</option>
                  <option value="reading_filipino">Reading (FIL)</option>
                </select>

                {masteredCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearMastered}
                    className="h-9 text-xs text-muted-foreground hover:text-destructive"
                    title="Clear mastered mistakes"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Clean Mastered
                  </Button>
                )}
              </div>
            </div>

            {/* List of items */}
            {filteredMistakes.length === 0 ? (
              <Card className="p-8 text-center border-dashed rounded-xl">
                <p className="text-sm text-muted-foreground">No mistakes match the selected filters.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredMistakes.map((mistake, idx) => {
                  const isExpanded = expandedMistakeId === mistake.id;
                  return (
                    <Card
                      key={mistake.id}
                      className={cn(
                        "border transition-all duration-200 overflow-hidden shadow-xs",
                        mistake.status === "mastered"
                          ? "border-emerald-500/30 bg-emerald-50/10 dark:bg-emerald-950/10"
                          : mistake.status === "practicing"
                          ? "border-amber-500/30 bg-amber-50/10 dark:bg-amber-950/10"
                          : "border-border hover:border-border/80"
                      )}
                    >
                      <div
                        onClick={() => setExpandedMistakeId(isExpanded ? null : mistake.id)}
                        className="p-4 flex items-start justify-between gap-3 cursor-pointer select-none hover:bg-muted/20 transition-colors"
                      >
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="text-[11px] font-semibold">
                              {SUBJECT_LABELS[mistake.subject] || mistake.subject}
                            </Badge>
                            {mistake.topic && (
                              <Badge variant="outline" className="text-[11px] text-muted-foreground capitalize">
                                {mistake.topic.replace(/_/g, " ")}
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] font-bold",
                                mistake.status === "mastered"
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                  : mistake.status === "practicing"
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                                  : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
                              )}
                            >
                              {mistake.status === "mastered"
                                ? "Mastered"
                                : mistake.status === "practicing"
                                ? "Practicing"
                                : "Needs Review"}
                            </Badge>
                            {mistake.missCount > 1 && (
                              <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                                Missed {mistake.missCount}x
                              </span>
                            )}
                          </div>

                          <div className="text-sm font-medium text-foreground line-clamp-2">
                            <SmartText text={mistake.questionText} />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 pt-1">
                          <span className="text-xs font-semibold text-primary">
                            {isExpanded ? "Collapse ▲" : "View Breakdown ▼"}
                          </span>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t bg-muted/10 space-y-4 animate-in fade-in duration-200">
                          {mistake.diagram && (
                            <div className="my-2 p-2 bg-muted/20 rounded-lg border">
                              <DiagramRenderer diagram={mistake.diagram} />
                            </div>
                          )}

                          {/* Choices Breakdown */}
                          {mistake.choices && mistake.choices.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Choices
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {mistake.choices.map((c) => {
                                  const isCorrect = c.id === mistake.correctAnswer;
                                  const isSelected = c.id === mistake.selectedAnswer;
                                  return (
                                    <div
                                      key={c.id}
                                      className={cn(
                                        "p-2.5 rounded-lg border text-xs font-medium flex items-start gap-2",
                                        isCorrect
                                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 font-bold"
                                          : isSelected
                                          ? "border-rose-500 bg-rose-500/10 text-rose-950 dark:text-rose-200"
                                          : "border-border/60 bg-card"
                                      )}
                                    >
                                      <span className="font-bold shrink-0">{c.id}.</span>
                                      <span className="flex-1">{c.text}</span>
                                      {isCorrect && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />}
                                      {isSelected && !isCorrect && (
                                        <span className="text-[10px] uppercase font-bold text-rose-600 shrink-0">
                                          (Your pick)
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Explanation */}
                          <div className="p-3 bg-muted/30 rounded-xl border text-xs sm:text-sm space-y-1">
                            <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider block">
                              Solution & Concept Rationale
                            </span>
                            <div className="text-foreground leading-relaxed">
                              <SmartText text={mistake.explanation || "No explanation recorded."} />
                            </div>
                          </div>

                          {/* Status Actions Bar */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground mr-1">Mark status:</span>
                              <Button
                                size="sm"
                                variant={mistake.status === "needs_review" ? "default" : "outline"}
                                onClick={() => updateMistakeStatus(mistake.id, "needs_review", universityId, user?.uid).then(refreshMistakes)}
                                className="h-7 text-xs px-2.5 rounded-md"
                              >
                                Needs Review
                              </Button>
                              <Button
                                size="sm"
                                variant={mistake.status === "practicing" ? "default" : "outline"}
                                onClick={() => updateMistakeStatus(mistake.id, "practicing", universityId, user?.uid).then(refreshMistakes)}
                                className="h-7 text-xs px-2.5 rounded-md"
                              >
                                Practicing
                              </Button>
                              <Button
                                size="sm"
                                variant={mistake.status === "mastered" ? "default" : "outline"}
                                onClick={() => updateMistakeStatus(mistake.id, "mastered", universityId, user?.uid).then(refreshMistakes)}
                                className="h-7 text-xs px-2.5 rounded-md text-emerald-600"
                              >
                                ✓ Mastered
                              </Button>
                            </div>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeMistake(mistake.id, universityId, user?.uid).then(refreshMistakes)}
                              className="h-7 text-xs text-muted-foreground hover:text-destructive px-2"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
