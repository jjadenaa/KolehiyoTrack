import React, { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Target, Award, Flame, Check, Calendar, GraduationCap } from "lucide-react";
import { Session } from "@/types/session";
import { useAuth } from "@/context/AuthContext";

interface DailyMissionsTrackerProps {
  sessions: Session[];
  universityId?: string;
}

export function DailyMissionsTracker({ sessions, universityId = "upcat" }: DailyMissionsTrackerProps) {
  const { user, signInWithGoogle, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"missions" | "targets">("missions");

  // Determine displayName of the university test target
  const testDisplayName = useMemo(() => {
    return universityId ? universityId.toUpperCase() : "UPCAT";
  }, [universityId]);

  // Set the target questions count dynamically based on the current date so it resets & changes every single day (between 150 and 250)
  const dailyGoal = useMemo(() => {
    const dateStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      hash = dateStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    const min = 150;
    const max = 250;
    const step = 10; // nice round values
    const range = (max - min) / step; // 10 steps
    const hashStep = Math.abs(hash) % (range + 1);
    return min + hashStep * step; // Dynamically cycles: 150, 160, ..., 250
  }, []);

  // 1. Calculate today's local date in YYYY-MM-DD
  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD format
  }, []);

  // 2. Filter sessions created today
  const todaysSessions = useMemo(() => {
    if (!sessions) return [];
    return sessions.filter((s) => {
      if (!s.createdAt) return false;
      const d = new Date(s.createdAt);
      return d.toLocaleDateString("en-CA") === todayStr;
    });
  }, [sessions, todayStr]);

  // 3. Define the missions
  const missions = useMemo(() => {
    // Mission 1: Answer daily target questions today
    const m1Target = dailyGoal;
    const m1Current = todaysSessions.reduce((sum, s) => sum + (s.totalQuestions || 0), 0);
    const m1Completed = m1Current >= m1Target;
    const m1Percent = Math.min(100, Math.round((m1Current / m1Target) * 100));

    // Mission 2: Complete at least 1 mock test session today
    const m2Target = 1;
    const m2Current = todaysSessions.length;
    const m2Completed = m2Current >= m2Target;
    const m2Percent = Math.min(100, Math.round((m2Current / m2Target) * 100));

    // Mission 3: Achieve 70% or higher score in any session today
    const m3Target = 1;
    const hasPerfectScoreSession = todaysSessions.some((s) => {
      if (s.totalQuestions === 0) return false;
      const accuracy = (s.totalScore / s.totalQuestions) * 100;
      return accuracy >= 70;
    });
    const m3Current = hasPerfectScoreSession ? 1 : 0;
    const m3Completed = hasPerfectScoreSession;
    const m3Percent = hasPerfectScoreSession ? 100 : 0;

    return [
      {
        id: "daily_q_count",
        title: "Daily Study Stamina",
        description: `Complete ${dailyGoal} practice questions today.`,
        icon: <Target className="h-4 w-4" />,
        completed: m1Completed,
        current: m1Current,
        target: m1Target,
        percent: m1Percent,
        progressText: `${m1Current} / ${m1Target} q's`,
        color: "text-orange-500",
        bg: "bg-orange-500/10 dark:bg-orange-950/20",
        border: "border-orange-500/30",
      },
      {
        id: "daily_session",
        title: "Dedicated Practice",
        description: "Complete 1 full mock test session today.",
        icon: <Award className="h-4 w-4" />,
        completed: m2Completed,
        current: m2Current,
        target: m2Target,
        percent: m2Percent,
        progressText: `${m2Current} / ${m2Target} session`,
        color: "text-indigo-500",
        bg: "bg-indigo-500/10 dark:bg-indigo-950/20",
        border: "border-indigo-500/30",
      },
      {
        id: "daily_accuracy",
        title: "High Precision",
        description: "Achieve a score of 70% or more in any session completed today.",
        icon: <Flame className="h-4 w-4" />,
        completed: m3Completed,
        current: m3Current,
        target: m3Target,
        percent: m3Percent,
        progressText: m3Completed ? "Goal Met!" : "Not started",
        color: "text-emerald-500",
        bg: "bg-emerald-500/10 dark:bg-emerald-950/20",
        border: "border-emerald-500/30",
      },
    ];
  }, [todaysSessions, dailyGoal]);

  // 4. Calculate Admission targets based on user statistics
  const subtestPerformance = useMemo(() => {
    const stats = {
      reading: { total: 0, correct: 0, wrong: 0, blank: 0 },
      language: { total: 0, correct: 0, wrong: 0, blank: 0 },
      science: { total: 0, correct: 0, wrong: 0, blank: 0 },
      math: { total: 0, correct: 0, wrong: 0, blank: 0 },
    };

    if (sessions) {
      sessions.forEach((s) => {
        if (!s.answers) return;
        s.answers.forEach((ans) => {
          const sub = ans.subject || "";
          if (sub.startsWith("reading_")) {
            stats.reading.total++;
            if (ans.isCorrect) stats.reading.correct++;
            else if (ans.isBlank) stats.reading.blank++;
            else stats.reading.wrong++;
          } else if (sub.startsWith("language_")) {
            stats.language.total++;
            if (ans.isCorrect) stats.language.correct++;
            else if (ans.isBlank) stats.language.blank++;
            else stats.language.wrong++;
          } else if (sub === "science") {
            stats.science.total++;
            if (ans.isCorrect) stats.science.correct++;
            else if (ans.isBlank) stats.science.blank++;
            else stats.science.wrong++;
          } else if (sub === "math") {
            stats.math.total++;
            if (ans.isCorrect) stats.math.correct++;
            else if (ans.isBlank) stats.math.blank++;
            else stats.math.wrong++;
          }
        });
      });
    }

    // Helper to calculate Right-Minus-Quarter-Wrong metric
    const calculateSubtestMetric = (
      correct: number,
      wrong: number,
      total: number,
      targetItems: number,
      minPercent: number,
      maxPercent: number
    ) => {
      const netScore = universityId === "upcat" ? correct - 0.25 * wrong : correct;
      const accuracyPercent = total > 0 ? (netScore / total) * 100 : 0;
      const estNetScoreOnTargetScale = total > 0 ? (netScore / total) * targetItems : 0;
      
      let status: "Excellent" | "On Track" | "Needs Practice" | "No Data" = "No Data";
      let statusColor = "text-muted-foreground bg-muted/50 border-muted-foreground/20";
      
      if (total > 0) {
        if (accuracyPercent >= minPercent) {
          status = "Excellent";
          statusColor = "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
        } else if (accuracyPercent >= minPercent - 10) {
          status = "On Track";
          statusColor = "text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/20";
        } else {
          status = "Needs Practice";
          statusColor = "text-red-700 dark:text-red-400 bg-red-500/10 border-red-500/20";
        }
      }

      return {
        answered: total,
        netScore: Math.max(0, netScore).toFixed(1),
        accuracyPercent: Math.max(0, accuracyPercent).toFixed(0),
        estNetScoreOnTargetScale: Math.max(0, estNetScoreOnTargetScale).toFixed(1),
        status,
        statusColor,
      };
    };

    return [
      {
        name: "Reading Comprehension",
        items: "80",
        targetPercent: "85%–90%",
        targetScore: "66–70+",
        color: "text-indigo-500",
        metric: calculateSubtestMetric(stats.reading.correct, stats.reading.wrong, stats.reading.total, 80, 85, 90),
      },
      {
        name: "Language Proficiency",
        items: "80",
        targetPercent: "80%–85%",
        targetScore: "64–68",
        color: "text-orange-500",
        metric: calculateSubtestMetric(stats.language.correct, stats.language.wrong, stats.language.total, 80, 80, 85),
      },
      {
        name: "Science",
        items: "60",
        targetPercent: "60%–66%",
        targetScore: "36–40",
        color: "text-emerald-500",
        metric: calculateSubtestMetric(stats.science.correct, stats.science.wrong, stats.science.total, 60, 60, 66),
      },
      {
        name: "Mathematics",
        items: "60",
        targetPercent: "58%–63%",
        targetScore: "35–38",
        color: "text-rose-500",
        metric: calculateSubtestMetric(stats.math.correct, stats.math.wrong, stats.math.total, 60, 58, 63),
      },
    ];
  }, [sessions]);

  // Auth gate
  if (!authLoading && !user) {
    return (
      <Card className="shadow-sm relative overflow-hidden group">
        <CardHeader className="pb-3 bg-muted/20 dark:bg-muted/10 border-b">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-md font-bold">Missions and Goals</CardTitle>
              <CardDescription className="text-xs">Resets daily at midnight</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="relative blur-[6px] opacity-60 pointer-events-none select-none filter transition-all duration-300">
            <div className="space-y-3">
              <div className="p-3 border rounded-lg bg-card space-y-2">
                <div className="flex justify-between font-medium text-xs">
                  <span>Daily Study Stamina</span>
                  <span>0 / 180</span>
                </div>
                <Progress value={0} className="h-1.5" />
              </div>
              <div className="p-3 border rounded-lg bg-card space-y-2">
                <div className="flex justify-between font-medium text-xs">
                  <span>{testDisplayName} Reading Targets</span>
                  <span>85% - 90%</span>
                </div>
                <Progress value={0} className="h-1.5" />
              </div>
            </div>
          </div>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/20 backdrop-blur-[2px] p-6 text-center z-10">
            <div className="bg-card p-5 rounded-xl shadow-lg border w-full max-w-xs flex flex-col items-center space-y-3">
              <Calendar className="h-8 w-8 text-primary opacity-80" />
              <p className="text-sm font-medium">Sign in to unlock daily missions and subtest admission targets!</p>
              <Button
                onClick={async () => {
                  try {
                    await signInWithGoogle();
                  } catch(e) {
                    console.error(e);
                  }
                }}
                className="w-full gap-2 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground mt-2"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border border-border overflow-hidden">
      <CardHeader className="pb-3 bg-muted/20 dark:bg-muted/10 border-b">
        <div className="flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-md font-bold">Missions and Goals</CardTitle>
                <CardDescription className="text-xs">Resets daily at midnight</CardDescription>
              </div>
            </div>
          </div>

          {/* Toggle buttons */}
          <div className="grid grid-cols-2 p-1 bg-muted/50 dark:bg-muted/20 border rounded-lg text-xs font-medium">
            <button
              onClick={() => setActiveTab("missions")}
              className={`py-1.5 rounded-md transition-all ${
                activeTab === "missions"
                  ? "bg-background text-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Daily Missions
            </button>
            <button
              onClick={() => setActiveTab("targets")}
              className={`py-1.5 rounded-md transition-all ${
                activeTab === "targets"
                  ? "bg-background text-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {testDisplayName} Targets
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 min-h-[280px]">
        {activeTab === "missions" ? (
          <div className="space-y-3">
            {missions.map((m) => (
              <div
                key={m.id}
                className={`p-3 rounded-lg border transition-all duration-200 ${
                  m.completed
                    ? "bg-emerald-500/5 border-emerald-500/30 dark:bg-emerald-950/10"
                    : "bg-card border-border/80"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`p-1.5 rounded-lg ${m.completed ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400" : `${m.bg} ${m.color}`}`}>
                    {m.completed ? <Check className="h-4 w-4 stroke-[3px]" /> : m.icon}
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-bold ${m.completed ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"}`}>
                        {m.title}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {m.progressText}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {m.description}
                    </p>
                    <div className="pt-1.5">
                      <Progress
                        value={m.percent}
                        className="h-1.5 bg-muted"
                        indicatorClassName={m.completed ? "bg-emerald-500" : m.id === "daily_q_count" ? "bg-orange-500" : "bg-indigo-500"}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3.5">
            {subtestPerformance.map((sub) => {
              const isNoData = sub.metric.answered === 0;

              return (
                <div key={sub.name} className="p-3 rounded-xl border bg-card border-border/60 hover:border-border transition-all duration-200">
                  <div className="flex items-center justify-between gap-2 pb-2">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-foreground block">{sub.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        Goal: <strong className="text-foreground">{sub.targetPercent}</strong> ({universityId === "upcat" ? "Net score" : "Score"}: {sub.targetScore})
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sub.metric.statusColor}`}>
                      {sub.metric.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-1 border-t border-muted/30">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      {isNoData ? (
                        <span>No practice data yet</span>
                      ) : (
                        <>
                          <span>Avg: <strong className="text-foreground font-semibold">{sub.metric.accuracyPercent}% {universityId === "upcat" ? "Net" : "Score"}</strong> ({sub.metric.answered} q's)</span>
                          <span>Est: <strong className="text-primary font-bold">{sub.metric.estNetScoreOnTargetScale} / {sub.items}</strong></span>
                        </>
                      )}
                    </div>
                    <Progress
                      value={isNoData ? 0 : parseInt(sub.metric.accuracyPercent, 10)}
                      className="h-1 bg-muted/60"
                      indicatorClassName={
                        sub.metric.status === "Excellent"
                          ? "bg-emerald-500"
                          : sub.metric.status === "On Track"
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
