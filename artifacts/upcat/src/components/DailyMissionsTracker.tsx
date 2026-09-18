import React, { useState, useMemo, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Target, Award, Flame, Check, Calendar, GraduationCap, BookOpen, Zap, Sparkles } from "lucide-react";
import { Session } from "@/types/session";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

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
    // Mission 1 (Core): Answer daily target questions today
    const m1Target = dailyGoal;
    const m1Current = todaysSessions.reduce((sum, s) => sum + (s.totalQuestions || 0), 0);
    const m1Completed = m1Current >= m1Target;
    const m1Percent = Math.min(100, Math.round((m1Current / m1Target) * 100));

    // Mission 2 (Core): Complete at least 1 mock test session today
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

    // Mission 4: Multidisciplinary Scholar (Subject Explorer)
    const uniqueSubjects = new Set<string>();
    todaysSessions.forEach((s) => {
      if (s.answers) {
        s.answers.forEach((ans) => {
          if (ans.subject) uniqueSubjects.add(ans.subject);
        });
      }
    });
    const m4Target = 2;
    const m4Current = uniqueSubjects.size;
    const m4Completed = m4Current >= m4Target;
    const m4Percent = Math.min(100, Math.round((m4Current / m4Target) * 100));

    // Mission 5: Quick Quiz Champion (Correct answers in one session >= 5)
    const m5Target = 5;
    const maxScoreSession = todaysSessions.reduce((max, s) => Math.max(max, s.totalScore || 0), 0);
    const m5Current = maxScoreSession;
    const m5Completed = m5Current >= m5Target;
    const m5Percent = Math.min(100, Math.round((m5Current / m5Target) * 100));

    // Mission 6: Academic Dominance (Total correct answers today >= 15)
    const m6Target = 15;
    const totalCorrectToday = todaysSessions.reduce((sum, s) => sum + (s.totalScore || 0), 0);
    const m6Current = totalCorrectToday;
    const m6Completed = m6Current >= m6Target;
    const m6Percent = Math.min(100, Math.round((m6Current / m6Target) * 100));

    // Mission 7: Language Guru (Practice Filipino or English Reading Proficiency >= 8 questions today)
    let langQuestionsCount = 0;
    todaysSessions.forEach((s) => {
      if (s.answers) {
        s.answers.forEach((ans) => {
          const sub = (ans.subject || "").toLowerCase();
          if (sub.includes("filipino") || sub.includes("reading") || sub.includes("language") || sub.includes("english")) {
            langQuestionsCount++;
          }
        });
      }
    });
    const m7Target = 8;
    const m7Current = langQuestionsCount;
    const m7Completed = m7Current >= m7Target;
    const m7Percent = Math.min(100, Math.round((m7Current / m7Target) * 100));

    // Mission 8: Time Champion (Complete a study session before 2:00 PM or after 7:00 PM local time today)
    const hasSessionInTimeWindow = todaysSessions.some((s) => {
      const date = new Date(s.endTime || s.createdAt || Date.now());
      const hours = date.getHours();
      return hours < 14 || hours >= 19;
    });
    const m8Target = 1;
    const m8Current = hasSessionInTimeWindow ? 1 : 0;
    const m8Completed = hasSessionInTimeWindow;
    const m8Percent = hasSessionInTimeWindow ? 100 : 0;

    // Define core missions (always included to build fundamental habits)
    const coreMissions = [
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
        indicatorColor: "bg-orange-500",
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
        indicatorColor: "bg-indigo-500",
      }
    ];

    // Define specialty mission pool (rotates deterministically every day so studying stays varied and exciting)
    const specialtyPool = [
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
        color: "text-rose-500",
        bg: "bg-rose-500/10 dark:bg-rose-950/20",
        border: "border-rose-500/30",
        indicatorColor: "bg-rose-500",
      },
      {
        id: "daily_subjects",
        title: "Multidisciplinary Scholar",
        description: "Practice questions in at least 2 different subjects today.",
        icon: <BookOpen className="h-4 w-4" />,
        completed: m4Completed,
        current: m4Current,
        target: m4Target,
        percent: m4Percent,
        progressText: `${m4Current} / ${m4Target} subjects`,
        color: "text-amber-500",
        bg: "bg-amber-500/10 dark:bg-amber-950/20",
        border: "border-amber-500/30",
        indicatorColor: "bg-amber-500",
      },
      {
        id: "daily_quick_champ",
        title: "Quiz Champion",
        description: "Achieve a correct score of 5 or more in a single session today.",
        icon: <Zap className="h-4 w-4" />,
        completed: m5Completed,
        current: m5Current,
        target: m5Target,
        percent: m5Percent,
        progressText: `${m5Current} / ${m5Target} correct`,
        color: "text-cyan-500",
        bg: "bg-cyan-500/10 dark:bg-cyan-950/20",
        border: "border-cyan-500/30",
        indicatorColor: "bg-cyan-500",
      },
      {
        id: "daily_correct_master",
        title: "Academic Dominance",
        description: "Answer at least 15 questions correctly overall today.",
        icon: <Sparkles className="h-4 w-4" />,
        completed: m6Completed,
        current: m6Current,
        target: m6Target,
        percent: m6Percent,
        progressText: `${m6Current} / ${m6Target} correct`,
        color: "text-emerald-500",
        bg: "bg-emerald-500/10 dark:bg-emerald-950/20",
        border: "border-emerald-500/30",
        indicatorColor: "bg-emerald-500",
      },
      {
        id: "daily_lang_guru",
        title: "Language & Reading Guru",
        description: "Answer at least 8 English, Reading, or Filipino questions today.",
        icon: <BookOpen className="h-4 w-4" />,
        completed: m7Completed,
        current: m7Current,
        target: m7Target,
        percent: m7Percent,
        progressText: `${m7Current} / ${m7Target} q's`,
        color: "text-blue-500",
        bg: "bg-blue-500/10 dark:bg-blue-950/20",
        border: "border-blue-500/30",
        indicatorColor: "bg-blue-500",
      },
      {
        id: "daily_time_champ",
        title: "Power Study Window",
        description: "Complete any mock test session before 2:00 PM or after 7:00 PM.",
        icon: <Sparkles className="h-4 w-4" />,
        completed: m8Completed,
        current: m8Current,
        target: m8Target,
        percent: m8Percent,
        progressText: m8Completed ? "Goal Met!" : "Not started",
        color: "text-violet-500",
        bg: "bg-violet-500/10 dark:bg-violet-950/20",
        border: "border-violet-500/30",
        indicatorColor: "bg-violet-500",
      }
    ];

    // Select 3 specialty missions based on day of the month
    const dayOfMonth = new Date().getDate();
    const idx1 = dayOfMonth % specialtyPool.length;
    const idx2 = (dayOfMonth + 2) % specialtyPool.length;
    const idx3 = (dayOfMonth + 4) % specialtyPool.length;

    const chosenIndices = Array.from(new Set([idx1, idx2, idx3]));
    while (chosenIndices.length < 3) {
      let nextIdx = 0;
      while (chosenIndices.includes(nextIdx)) {
        nextIdx = (nextIdx + 1) % specialtyPool.length;
      }
      chosenIndices.push(nextIdx);
    }

    const selectedSpecialties = chosenIndices.map(idx => specialtyPool[idx]);

    return [...coreMissions, ...selectedSpecialties];
  }, [todaysSessions, dailyGoal]);

  // Audio trigger for when a daily mission is successfully completed!
  const playCompletedChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      // Tone 1: Cheerful starting note
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      
      gain1.gain.setValueAtTime(0, ctx.currentTime);
      gain1.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.04);
      gain1.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
      
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.3);

      // Tone 2: Uplifting target chime (a major third/fifth higher, staggered)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
      
      gain2.gain.setValueAtTime(0, ctx.currentTime);
      gain2.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.08);
      osc2.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.warn("Auditory feedback audio context blocked or failed:", e);
    }
  };

  // Audio trigger for a grand fanfare chime when ALL daily missions are completed!
  const playAllCompletedChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const playTone = (freq: number, start: number, duration: number, vol: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      // Play an uplifting, triumphant ascending major chord progression!
      playTone(261.63, 0, 0.4, 0.08);      // C4
      playTone(329.63, 0.08, 0.4, 0.08);   // E4
      playTone(392.00, 0.16, 0.4, 0.08);   // G4
      playTone(523.25, 0.24, 0.6, 0.12);   // C5 (triumphant peak!)
      playTone(659.25, 0.32, 0.8, 0.12);   // E5 (sustained harmony)
    } catch (e) {
      console.warn("Triumphant fanfare blocked or failed:", e);
    }
  };

  const triggerConfettiShower = () => {
    try {
      // Confetti burst from left
      confetti({
        particleCount: 85,
        spread: 65,
        origin: { x: 0, y: 0.8 }
      });
      // Confetti burst from right
      setTimeout(() => {
        confetti({
          particleCount: 85,
          spread: 65,
          origin: { x: 1, y: 0.8 }
        });
      }, 200);
      // Main burst in the center
      setTimeout(() => {
        confetti({
          particleCount: 110,
          spread: 110,
          origin: { x: 0.5, y: 0.6 }
        });
      }, 400);
    } catch (e) {
      console.warn("Confetti failed to fire:", e);
    }
  };

  const completedCount = useMemo(() => {
    return missions.filter((m) => m.completed).length;
  }, [missions]);

  const prevCompletedCountRef = useRef<number | null>(null);

  useEffect(() => {
    if (prevCompletedCountRef.current !== null && completedCount > prevCompletedCountRef.current) {
      // If we just finished all active daily missions
      if (completedCount === missions.length) {
        playAllCompletedChime();
        triggerConfettiShower();
      } else {
        playCompletedChime();
      }
    }
    prevCompletedCountRef.current = completedCount;
  }, [completedCount, missions.length]);

  // 4. Calculate Admission targets based on university subjects and user statistics
  const subtestPerformance = useMemo(() => {
    const uni = (universityId || "upcat").toLowerCase();

    // Map each subject key to its user stats
    const statsBySubject: Record<string, { total: number; correct: number; wrong: number; blank: number }> = {};

    if (sessions) {
      sessions.forEach((s) => {
        if (!s.answers) return;
        s.answers.forEach((ans) => {
          const sub = ans.subject || "";
          if (!statsBySubject[sub]) {
            statsBySubject[sub] = { total: 0, correct: 0, wrong: 0, blank: 0 };
          }
          statsBySubject[sub].total++;
          if (ans.isCorrect) statsBySubject[sub].correct++;
          else if (ans.isBlank) statsBySubject[sub].blank++;
          else statsBySubject[sub].wrong++;
        });
      });
    }

    // Helper to calculate Right-Minus-Quarter-Wrong (for UPCAT) or standard correct %
    const calculateSubtestMetric = (
      subKeys: string[],
      targetItems: number,
      minPercent: number,
      maxPercent: number
    ) => {
      let correct = 0;
      let wrong = 0;
      let total = 0;

      subKeys.forEach((key) => {
        // match exact or prefix (e.g., 'reading' matches 'reading_english', 'reading_filipino')
        Object.entries(statsBySubject).forEach(([sKey, stat]) => {
          if (sKey === key || sKey.startsWith(`${key}_`) || sKey.startsWith(key)) {
            correct += stat.correct;
            wrong += stat.wrong;
            total += stat.total;
          }
        });
      });

      const netScore = uni === "upcat" ? correct - 0.25 * wrong : correct;
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

    // Realistic target profiles calibrated to university standards
    if (uni === "ateneo" || uni === "admu" || uni === "acet") {
      return [
        {
          name: "Language Proficiency",
          items: "100",
          targetPercent: "75%–82%",
          targetScore: "75–82",
          metric: calculateSubtestMetric(["language_english"], 100, 75, 82),
        },
        {
          name: "Reading Comprehension",
          items: "30",
          targetPercent: "70%–80%",
          targetScore: "21–24",
          metric: calculateSubtestMetric(["reading_english"], 30, 70, 80),
        },
        {
          name: "Mathematics Proficiency",
          items: "60",
          targetPercent: "65%–75%",
          targetScore: "39–45",
          metric: calculateSubtestMetric(["math"], 60, 65, 75),
        },
        {
          name: "Numerical Ability",
          items: "25",
          targetPercent: "68%–76%",
          targetScore: "17–19",
          metric: calculateSubtestMetric(["numerical_ability"], 25, 68, 76),
        },
        {
          name: "Logical Reasoning",
          items: "25",
          targetPercent: "72%–80%",
          targetScore: "18–20",
          metric: calculateSubtestMetric(["logical_reasoning"], 25, 72, 80),
        },
        {
          name: "Abstract Reasoning",
          items: "30",
          targetPercent: "70%–80%",
          targetScore: "21–24",
          metric: calculateSubtestMetric(["abstract_reasoning"], 30, 70, 80),
        },
        {
          name: "General Info & Analogies",
          items: "25",
          targetPercent: "65%–75%",
          targetScore: "16–19",
          metric: calculateSubtestMetric(["general_info"], 25, 65, 75),
        },
      ];
    }

    if (uni === "dlsu" || uni === "dcat") {
      return [
        {
          name: "Reasoning & Mental Ability",
          items: "30",
          targetPercent: "70%–80%",
          targetScore: "21–24",
          metric: calculateSubtestMetric(["abstract_reasoning"], 30, 70, 80),
        },
        {
          name: "English Proficiency",
          items: "40",
          targetPercent: "75%–85%",
          targetScore: "30–34",
          metric: calculateSubtestMetric(["language_english"], 40, 75, 85),
        },
        {
          name: "Reading Comprehension",
          items: "40",
          targetPercent: "72%–80%",
          targetScore: "29–32",
          metric: calculateSubtestMetric(["reading_english"], 40, 72, 80),
        },
        {
          name: "Statistics & Research",
          items: "45",
          targetPercent: "65%–75%",
          targetScore: "29–34",
          metric: calculateSubtestMetric(["statistics_research"], 45, 65, 75),
        },
        {
          name: "Mathematics",
          items: "45",
          targetPercent: "62%–72%",
          targetScore: "28–32",
          metric: calculateSubtestMetric(["math"], 45, 62, 72),
        },
        {
          name: "Science",
          items: "50",
          targetPercent: "64%–74%",
          targetScore: "32–37",
          metric: calculateSubtestMetric(["science"], 50, 64, 74),
        },
      ];
    }

    if (uni === "ust" || uni === "ustet") {
      return [
        {
          name: "Mental Ability",
          items: "60",
          targetPercent: "70%–80%",
          targetScore: "42–48",
          metric: calculateSubtestMetric(["abstract_reasoning"], 60, 70, 80),
        },
        {
          name: "English / Language",
          items: "80",
          targetPercent: "72%–82%",
          targetScore: "58–66",
          metric: calculateSubtestMetric(["language_english"], 80, 72, 82),
        },
        {
          name: "Mathematics",
          items: "60",
          targetPercent: "62%–72%",
          targetScore: "37–43",
          metric: calculateSubtestMetric(["math"], 60, 62, 72),
        },
        {
          name: "Science",
          items: "80",
          targetPercent: "65%–75%",
          targetScore: "52–60",
          metric: calculateSubtestMetric(["science"], 80, 65, 75),
        },
      ];
    }

    if (uni === "bu" || uni === "bucet") {
      return [
        {
          name: "Language Proficiency (English)",
          items: "30",
          targetPercent: "70%–80%",
          targetScore: "21–24",
          metric: calculateSubtestMetric(["language_english"], 30, 70, 80),
        },
        {
          name: "Language Proficiency (Filipino)",
          items: "30",
          targetPercent: "72%–82%",
          targetScore: "22–25",
          metric: calculateSubtestMetric(["language_filipino"], 30, 72, 82),
        },
        {
          name: "Reading Comprehension",
          items: "60",
          targetPercent: "70%–78%",
          targetScore: "42–47",
          metric: calculateSubtestMetric(["reading_english", "reading_filipino"], 60, 70, 78),
        },
        {
          name: "Mathematics",
          items: "50",
          targetPercent: "60%–70%",
          targetScore: "30–35",
          metric: calculateSubtestMetric(["math"], 50, 60, 70),
        },
        {
          name: "Science",
          items: "60",
          targetPercent: "62%–72%",
          targetScore: "37–43",
          metric: calculateSubtestMetric(["science"], 60, 62, 72),
        },
      ];
    }

    // Default: UPCAT standard (with right-minus-1/4 wrong net score calibration)
    return [
      {
        name: "Reading Comprehension",
        items: "80",
        targetPercent: "75%–85%",
        targetScore: "60–68",
        metric: calculateSubtestMetric(["reading_english", "reading_filipino"], 80, 75, 85),
      },
      {
        name: "Language Proficiency",
        items: "80",
        targetPercent: "72%–80%",
        targetScore: "58–64",
        metric: calculateSubtestMetric(["language_english", "language_filipino"], 80, 72, 80),
      },
      {
        name: "Science",
        items: "60",
        targetPercent: "62%–70%",
        targetScore: "37–42",
        metric: calculateSubtestMetric(["science"], 60, 62, 70),
      },
      {
        name: "Mathematics",
        items: "60",
        targetPercent: "60%–68%",
        targetScore: "36–41",
        metric: calculateSubtestMetric(["math"], 60, 60, 68),
      },
    ];
  }, [sessions, universityId]);

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
        <AnimatePresence mode="wait">
          {activeTab === "missions" ? (
            <motion.div
              key="missions-container"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {missions.map((m, index) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ 
                    opacity: 1, 
                    x: 0,
                    ...(m.completed ? {
                      scale: [1, 1.015, 1],
                      boxShadow: [
                        "0 0 0px rgba(16,185,129,0)",
                        "0 0 10px rgba(16,185,129,0.1)",
                        "0 0 0px rgba(16,185,129,0)"
                      ]
                    } : {})
                  }}
                  whileHover={{ scale: 1.01, translateY: -1 }}
                  transition={{ 
                    opacity: { duration: 0.25, delay: index * 0.05 },
                    x: { duration: 0.25, delay: index * 0.05 },
                    scale: { duration: 0.2 },
                    boxShadow: { 
                      repeat: m.completed ? Infinity : 0, 
                      repeatType: "reverse", 
                      duration: 3,
                      delay: index * 0.1 
                    }
                  }}
                  className={`p-3 rounded-lg border transition-all duration-200 relative overflow-hidden ${
                    m.completed
                      ? "bg-emerald-500/5 border-emerald-500/30 dark:bg-emerald-950/10"
                      : "bg-card border-border/80 hover:border-border"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <motion.div 
                      animate={m.completed ? { rotate: [0, 10, -10, 0] } : {}}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className={`p-1.5 rounded-lg shrink-0 ${m.completed ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400" : `${m.bg} ${m.color}`}`}
                    >
                      {m.completed ? <Check className="h-4 w-4 stroke-[3px]" /> : m.icon}
                    </motion.div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-bold ${m.completed ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"}`}>
                          {m.title}
                        </span>
                        <motion.span 
                          animate={m.completed ? { scale: [1, 1.1, 1] } : {}}
                          className="text-[10px] font-bold text-muted-foreground"
                        >
                          {m.progressText}
                        </motion.span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        {m.description}
                      </p>
                      <div className="pt-1.5">
                        <Progress
                          value={m.percent}
                          className="h-1.5 bg-muted"
                          indicatorClassName={m.completed ? "bg-emerald-500" : m.indicatorColor}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="targets-container"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-3.5"
            >
              {subtestPerformance.map((sub, index) => {
                const isNoData = sub.metric.answered === 0;

                return (
                  <motion.div 
                    key={sub.name}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ scale: 1.01, translateY: -1 }}
                    transition={{ duration: 0.25, delay: index * 0.05 }}
                    className="p-3 rounded-xl border bg-card border-border/60 hover:border-border transition-all duration-200"
                  >
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
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
