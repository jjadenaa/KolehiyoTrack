import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, GraduationCap, Plus, ArrowRight, AlertTriangle, Flame, Calendar, Trash2, Edit3, ExternalLink, BrainCircuit, Sparkles, Layers, CalendarCheck, Bell, BellRing, Search, Filter, RotateCcw, X, SlidersHorizontal, CheckCircle2 } from "lucide-react";
import { useUpcatCountdown } from "@/hooks/useCountdown";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import {
  getLocalAddedUniversities,
  subscribeUserAddedUniversities,
  saveUserAddedUniversities,
  getLocalExamDates,
  subscribeUserExamDates,
  saveSingleExamDate,
  calculateDaysRemaining,
  formatCustomDateDisplay,
  subscribeUserCalendarFilters,
  saveUserCalendarFilters,
  DEFAULT_CALENDAR_FILTERS,
  CalendarFilters,
  TRACKED_UNIVERSITIES,
  getUniversityBrandColor,
} from "@/lib/userUniversities";
import { listSessions } from "@/lib/firestoreSessions";
import { getLocalMistakes } from "@/lib/mistakeDiary";
import { APPLICATION_TIMELINES, ApplicationTimeline } from "@/lib/applicationTimelines";
import { CalendarWidget } from "@/components/CalendarWidget";
import { AIChatbox } from "@/components/AIChatbox";
import { UniversityLogo } from "@/components/UniversityLogo";
import { SetExamDateDialog } from "@/components/SetExamDateDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const UNIVERSITIES = TRACKED_UNIVERSITIES;

export default function Dashboard() {
  const { toast } = useToast();
  const upcatDaysLeft = useUpcatCountdown();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [streak, setStreak] = useState(0);
  const [hasPracticedToday, setHasPracticedToday] = useState(false);
  const [animateTrigger, setAnimateTrigger] = useState(0);
  const [dismissedWarning, setDismissedWarning] = useState(() => {
    return localStorage.getItem("kolehiyotrack_dismissed_auth_warning") === "true";
  });

  const [addedUniIds, setAddedUniIds] = useState<string[]>(() => getLocalAddedUniversities());
  const [userExamDates, setUserExamDates] = useState<Record<string, string>>(() => getLocalExamDates());
  const [isEditMode, setIsEditMode] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogDates, setAddDialogDates] = useState<Record<string, string>>({});
  const [expandedAddDateUni, setExpandedAddDateUni] = useState<string | null>(null);
  
  // State for date editing dialog
  const [editingDateUni, setEditingDateUni] = useState<{ id: string; name: string; defaultDate: string } | null>(null);

  // Notification States
  const [notifPermission, setNotifPermission] = useState<string>(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    return Notification.permission;
  });
  const [enableStudyReminders, setEnableStudyReminders] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("kt_notif_study") !== "false";
  });
  const [enableMissionAlerts, setEnableMissionAlerts] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("kt_notif_missions") !== "false";
  });
  const [enableCountdownAlerts, setEnableCountdownAlerts] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("kt_notif_countdown") !== "false";
  });

  const requestNotifPermission = async () => {
    if (!("Notification" in window)) {
      toast({
        title: "Notifications Unsupported",
        description: "Your browser does not support Web Notifications.",
        variant: "destructive"
      });
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      if (permission === "granted") {
        toast({
          title: "Notifications Enabled! 🔔",
          description: "You will now receive study reminders and countdown alerts.",
        });
        sendBrowserNotification(
          "KolehiyoTrack Reminders Enabled! 🎯",
          "Awesome! We will remind you to study, track daily missions, and count down your CET dates!"
        );
      } else if (permission === "denied") {
        toast({
          title: "Permission Denied",
          description: "Please enable notifications in your browser settings to receive reminders.",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error("Failed to request notification permission:", err);
    }
  };

  const sendBrowserNotification = (title: string, body: string) => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    try {
      new Notification(title, {
        body,
        icon: `${import.meta.env.BASE_URL}logo.png`,
      });
    } catch (err) {
      // Fallback to service worker showNotification if the standard constructor isn't allowed in some iframe environments
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            body,
            icon: `${import.meta.env.BASE_URL}logo.png`,
          });
        });
      } else {
        console.warn("Could not display native notification inside preview iframe constraint:", err);
      }
    }
  };

  const triggerTestNotification = (type: "study" | "mission" | "countdown" | "streak") => {
    if (notifPermission !== "granted") {
      requestNotifPermission();
      return;
    }

    if (type === "study") {
      sendBrowserNotification(
        "📝 Time to study! | KolehiyoTrack",
        "Keep your momentum up! A quick 10-question mock subtest is all it takes to keep your streak hot. 🔥"
      );
    } else if (type === "mission") {
      sendBrowserNotification(
        "🎯 Daily Missions Reset! | KolehiyoTrack",
        "Your 5 daily missions for today are waiting! Complete them to unlock your level-up chime & confetti cascade."
      );
    } else if (type === "countdown") {
      const upcatDays = upcatDaysLeft !== null ? upcatDaysLeft : 12;
      sendBrowserNotification(
        "⏳ CET Countdown | KolehiyoTrack",
        `Tick-tock! Only ${upcatDays} days remaining until your UPCAT exam target. Let's make today count!`
      );
    } else if (type === "streak") {
      sendBrowserNotification(
        "🔥 Daily Streak Safe! | KolehiyoTrack",
        `Fantastic job! Your study streak is secure. You are officially on a ${streak + 1}-day streak!`
      );
    }
    toast({
      title: "Test Alert Sent!",
      description: "A push notification has been fired. Check your desktop or phone notification center!",
    });
  };

  // Sync notification preferences to localStorage and trigger global window events
  useEffect(() => {
    localStorage.setItem("kt_notif_study", String(enableStudyReminders));
    window.dispatchEvent(new Event("kt_notification_settings_changed"));
  }, [enableStudyReminders]);

  useEffect(() => {
    localStorage.setItem("kt_notif_missions", String(enableMissionAlerts));
    window.dispatchEvent(new Event("kt_notification_settings_changed"));
  }, [enableMissionAlerts]);

  useEffect(() => {
    localStorage.setItem("kt_notif_countdown", String(enableCountdownAlerts));
    window.dispatchEvent(new Event("kt_notification_settings_changed"));
  }, [enableCountdownAlerts]);

  // Synchronize state when changed from SettingsModal
  useEffect(() => {
    const handleSync = () => {
      setEnableStudyReminders(localStorage.getItem("kt_notif_study") !== "false");
      setEnableMissionAlerts(localStorage.getItem("kt_notif_missions") !== "false");
      setEnableCountdownAlerts(localStorage.getItem("kt_notif_countdown") !== "false");
      if (typeof window !== "undefined" && "Notification" in window) {
        setNotifPermission(Notification.permission);
      }
    };
    window.addEventListener("kt_notification_settings_changed", handleSync);
    return () => {
      window.removeEventListener("kt_notification_settings_changed", handleSync);
    };
  }, []);

  useEffect(() => {
    return subscribeUserAddedUniversities(user, (ids) => {
      setAddedUniIds(ids);
    });
  }, [user]);

  useEffect(() => {
    return subscribeUserExamDates(user, (dates) => {
      setUserExamDates(dates);
    });
  }, [user]);

  const filteredUniversities = UNIVERSITIES.filter(uni => addedUniIds.includes(uni.id));

  useEffect(() => {
    if (filteredUniversities.length === 0) {
      setIsEditMode(false);
    }
  }, [filteredUniversities.length]);

  const [calendarFilters, setCalendarFilters] = useState<CalendarFilters>(DEFAULT_CALENDAR_FILTERS);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

  const activeFilterCount = useMemo(() => {
    return [
      calendarFilters.institutionType !== "all",
      calendarFilters.islandGroup !== "all",
      calendarFilters.region !== "all",
      calendarFilters.category !== "all",
      calendarFilters.openMonth !== "all",
      calendarFilters.closeMonth !== "all",
    ].filter(Boolean).length;
  }, [calendarFilters]);

  useEffect(() => {
    return subscribeUserCalendarFilters(user, (filters) => {
      setCalendarFilters(filters);
    });
  }, [user]);

  const handleUpdateCalendarFilter = (key: keyof CalendarFilters, val: string) => {
    const updated = { ...calendarFilters, [key]: val };
    setCalendarFilters(updated);
    saveUserCalendarFilters(user, updated);
  };

  const handleResetCalendarFilters = () => {
    setCalendarFilters(DEFAULT_CALENDAR_FILTERS);
    saveUserCalendarFilters(user, DEFAULT_CALENDAR_FILTERS);
  };

  const visibleTimelines = APPLICATION_TIMELINES.filter((item) => {
    // Date Expiry Check (max 7 days past close date)
    if (item.closeDate) {
      const sevenDaysAfterClose = new Date(item.closeDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (new Date() > sevenDaysAfterClose) return false;
    }

    // 1. Keyword search (fullName, shortName, id, region)
    if (calendarFilters.search.trim()) {
      const q = calendarFilters.search.toLowerCase().trim();
      const matchName = item.fullName.toLowerCase().includes(q);
      const matchShort = item.shortName?.toLowerCase().includes(q);
      const matchId = item.id.toLowerCase().includes(q);
      const matchRegion = item.region?.toLowerCase().includes(q);
      const matchType = item.institutionType?.toLowerCase().includes(q);
      if (!matchName && !matchShort && !matchId && !matchRegion && !matchType) return false;
    }

    // 2. Institution Type
    if (calendarFilters.institutionType !== "all") {
      if (calendarFilters.institutionType === "public_state") {
        if (item.institutionType !== "State University" && item.institutionType !== "Public") return false;
      } else if (item.institutionType !== calendarFilters.institutionType) {
        return false;
      }
    }

    // 3. Island Group
    if (calendarFilters.islandGroup !== "all") {
      if (item.islandGroup !== calendarFilters.islandGroup && item.islandGroup !== "Nationwide") return false;
    }

    // 4. Region
    if (calendarFilters.region !== "all") {
      if (item.region !== calendarFilters.region && item.region !== "Nationwide") return false;
    }

    // 5. Category (Big 4, UAAP, NCAA)
    if (calendarFilters.category !== "all") {
      if (calendarFilters.category === "big4" && !item.isBig4) return false;
      if (calendarFilters.category === "uaap" && !item.isUAAP) return false;
      if (calendarFilters.category === "ncaa" && !item.isNCAA) return false;
    }

    // 6. Open Month
    if (calendarFilters.openMonth !== "all") {
      const openM = item.openDate.getMonth() + 1;
      if (String(openM) !== calendarFilters.openMonth) return false;
    }

    // 7. Close Month
    if (calendarFilters.closeMonth !== "all") {
      if (!item.closeDate) return false;
      const closeM = item.closeDate.getMonth() + 1;
      if (String(closeM) !== calendarFilters.closeMonth) return false;
    }

    return true;
  }).sort((a, b) => {
    if (!a.closeDate && !b.closeDate) return 0;
    if (!a.closeDate) return 1;
    if (!b.closeDate) return -1;
    return a.closeDate.getTime() - b.closeDate.getTime();
  });

  useEffect(() => {
    setAnimateTrigger(prev => prev + 1);
  }, [streak]);

  useEffect(() => {
    if (user) {
      async function fetchStreak() {
        try {
          const allSessionsPromises = UNIVERSITIES.map(u => listSessions(user!.uid, u.id));
          const allSessionsArrays = await Promise.all(allSessionsPromises);
          const allSessions = allSessionsArrays.flat();
          
          if (allSessions.length === 0) {
            setStreak(0);
            setHasPracticedToday(false);
            return;
          }

          const dates = allSessions.map(s => {
             const d = new Date(s.createdAt);
             return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          });
          const uniqueDates = Array.from(new Set(dates)).sort((a, b) => b.localeCompare(a));
          
          let currentStreak = 0;
          const todayDate = new Date();
          const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth()+1).padStart(2,'0')}-${String(todayDate.getDate()).padStart(2,'0')}`;
          
          const yesterdayDate = new Date(Date.now() - 86400000);
          const yesterdayStr = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth()+1).padStart(2,'0')}-${String(yesterdayDate.getDate()).padStart(2,'0')}`;
          
          const practicedToday = uniqueDates.includes(todayStr);
          setHasPracticedToday(practicedToday);

          let expectedStr = todayStr;
          if (practicedToday) {
            // expected is today
          } else if (uniqueDates.includes(yesterdayStr)) {
             expectedStr = yesterdayStr;
          } else {
             // no streak
             setStreak(0);
             return;
          }
          
          let d = new Date(expectedStr);
          for (const ud of uniqueDates) {
             const expected = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
             if (ud === expected) {
                currentStreak++;
                d.setDate(d.getDate() - 1);
             } else if (ud > expected) {
                // ignore
             } else {
                break;
             }
          }
          setStreak(currentStreak);
        } catch (error) {
          console.error("Failed to fetch streak:", error);
        }
      }
      fetchStreak();
    } else {
      setStreak(0);
      setHasPracticedToday(false);
    }
  }, [user]);

  const isStreakAboutToEnd = Boolean(user && streak > 0 && !hasPracticedToday);

  const getFlameStyles = () => {
    if (!user || streak === 0) {
      return {
        container: "bg-muted text-muted-foreground",
        icon: "w-8 h-8",
        label: "Start your streak today!",
        badgeColor: "bg-muted text-muted-foreground text-[10px]"
      };
    }
    if (isStreakAboutToEnd) {
      return {
        container: "bg-gradient-to-br from-rose-500 via-orange-500 to-red-600 text-white shadow-lg shadow-rose-500/50 animate-pulse ring-4 ring-rose-500/50",
        icon: "w-8 h-8 drop-shadow-[0_2px_8px_rgba(244,63,94,0.7)] animate-bounce",
        label: "🔥 Streak About to End!",
        badgeColor: "bg-rose-600 text-white font-bold animate-pulse text-[10px]"
      };
    }
    if (streak >= 7) {
      return {
        container: "bg-gradient-to-br from-rose-500 via-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/30 animate-pulse",
        icon: "w-8 h-8 drop-shadow-[0_2px_8px_rgba(249,115,22,0.5)]",
        label: "Legendary Streak! 👑🔥",
        badgeColor: "bg-amber-500 text-white dark:bg-amber-600 text-[10px]"
      };
    }
    if (streak >= 3) {
      return {
        container: "bg-rose-100 dark:bg-rose-950/40 text-rose-500 animate-bounce [animation-duration:3s]",
        icon: "w-8 h-8",
        label: "You're on fire! 💥",
        badgeColor: "bg-rose-500 text-white dark:bg-rose-600 animate-pulse text-[10px]"
      };
    }
    // 1-2 days
    return {
      container: "bg-orange-100 dark:bg-orange-950/40 text-orange-500",
      icon: "w-8 h-8",
      label: "Streak active!",
      badgeColor: "bg-orange-500 text-white dark:bg-orange-600 text-[10px]"
    };
  };

  const flameStyle = getFlameStyles();

  const handleContinueAnyway = () => {
    localStorage.setItem("kolehiyotrack_dismissed_auth_warning", "true");
    setDismissedWarning(true);
  };

  const handleRemoveUniversity = (id: string) => {
    const newIds = addedUniIds.filter(uniId => uniId !== id);
    setAddedUniIds(newIds);
    saveUserAddedUniversities(user, newIds);
    saveSingleExamDate(user, id, "");
    toast({
      title: "University Removed",
      description: "University has been removed from your list of active study goals.",
    });
  };

  return (
    <Layout>
      <div className="space-y-8 max-w-5xl mx-auto w-full">
        <div className="space-y-4 text-center py-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
            Welcome to KolehiyoTrack
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Prepare for upcoming CETs with our high-fidelity mock test environment.
          </p>
          {!authLoading && !user && (
            <p className="text-xs text-destructive font-medium max-w-xl mx-auto mt-2 animate-fade-in">
              If you don't sign in, the questions might not sync across your devices or you won't be able to access your past sessions to view your progress.
            </p>
          )}
        </div>

        {/* Gemini AI Chatbox */}
        <AIChatbox />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column: Daily Streak */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">Daily Streak</h2>
            <Card className={`border-2 shadow-sm overflow-hidden relative transition-all ${
              isStreakAboutToEnd 
                ? "border-rose-500/60 bg-rose-500/10 dark:bg-rose-950/40 ring-2 ring-rose-500/40 animate-pulse" 
                : "border-orange-500/20 bg-orange-500/5 dark:bg-orange-500/10"
            }`}>
              <CardContent className="p-5 flex flex-col items-center justify-center text-center space-y-3">
                <div 
                  key={animateTrigger}
                  className={`p-2.5 rounded-full transition-all duration-500 animate-pop-flame ${flameStyle.container}`}
                >
                  <Flame className={flameStyle.icon} strokeWidth={1.5} />
                </div>
                {user ? (
                  <div className="space-y-2 w-full">
                    <div className="space-y-1">
                      <div className="text-3xl font-bold tracking-tight text-foreground">
                        {streak}
                      </div>
                      <div className="text-xs font-bold text-foreground/90 dark:text-foreground uppercase tracking-wider">
                        Day Streak
                      </div>
                    </div>
                    <Badge variant="secondary" className={`text-[10px] font-semibold py-0.5 px-2.5 ${flameStyle.badgeColor}`}>
                      {flameStyle.label}
                    </Badge>

                    {isStreakAboutToEnd && (
                      <div className="mt-3 p-3 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-950 dark:text-rose-100 text-xs font-medium space-y-1.5 animate-pulse shadow-sm">
                        <div className="flex items-center justify-center gap-1.5 font-bold text-rose-700 dark:text-rose-200 text-xs">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span>Streak Ends Today!</span>
                        </div>
                        <p className="text-xs leading-normal font-medium text-foreground dark:text-white">
                          You haven't practiced today. Complete a mock test before midnight to keep your <strong className="font-bold text-foreground dark:text-white">{streak}-day streak</strong> alive!
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-muted-foreground/50">-</div>
                    <div className="text-xs font-medium text-muted-foreground max-w-[150px]">
                      Sign in to track your daily streak
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="mt-6">
              <CalendarWidget />
            </div>

            {/* AI Error Log & Mistake Diary Card */}
            {(() => {
              const allMistakes = getLocalMistakes("upcat");
              const totalMistakes = allMistakes.length;
              const needsReview = allMistakes.filter((m) => m.status === "needs_review").length;
              const mastered = allMistakes.filter((m) => m.status === "mastered").length;

              return (
                <Card className="mt-6 border-2 border-primary/20 bg-gradient-to-br from-card to-amber-500/5 shadow-xs">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                          <BrainCircuit className="h-4 w-4" />
                        </div>
                        <CardTitle className="text-sm font-bold">Mistake Diary</CardTitle>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-bold">
                        {totalMistakes} logged
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-1">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {totalMistakes > 0
                        ? `You have ${needsReview} question${needsReview === 1 ? "" : "s"} ready for review and ${mastered} mastered.`
                        : "Missed mock test questions are automatically saved to your flashcard deck for smart reinforcement."}
                    </p>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full">
                      <Button asChild variant="default" size="sm" className="w-full h-8 text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 cursor-pointer">
                        <Link href="/mistakes">
                          <Layers className="h-3.5 w-3.5" />
                          Open Mistake Diary & Flashcards
                        </Link>
                      </Button>
                    </motion.div>
                  </CardContent>
                </Card>
              );
            })()}


          </div>

          {/* Right Column: My Universities & Application Timelines */}
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">My Universities</h2>
                <div className="flex items-center gap-2">
                  {filteredUniversities.length > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsEditMode(!isEditMode)} 
                      className="gap-2 h-9 text-xs sm:text-sm font-semibold border-muted-foreground/20 hover:bg-muted"
                    >
                      <Edit3 className="h-4 w-4 text-muted-foreground" />
                      {isEditMode ? "Done" : "Edit"}
                    </Button>
                  )}
                  <Button onClick={() => setAddDialogOpen(true)} size="sm" className="gap-2 h-9 text-xs sm:text-sm font-semibold">
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>
              </div>

              <div className="grid gap-4">
                {filteredUniversities.length === 0 ? (
                  <Card className="border border-dashed p-8 text-center flex flex-col items-center justify-center space-y-4 bg-muted/5 py-12">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                      <GraduationCap className="h-6 w-6" />
                    </div>
                    <div className="space-y-1.5">
                      <CardTitle className="text-lg font-bold">No Universities Added</CardTitle>
                      <CardDescription className="text-sm max-w-sm mx-auto">
                        Select universities you want to prepare for to start studying.
                      </CardDescription>
                    </div>
                    <Button onClick={() => setAddDialogOpen(true)} className="gap-2 font-semibold transition-transform duration-200 hover:scale-105 active:scale-95 cursor-pointer">
                      <Plus className="h-4 w-4" />
                      Add a University
                    </Button>
                  </Card>
                ) : (
                  filteredUniversities.map((uni) => {
                    const customDate = userExamDates[uni.id];
                    const displayDate = customDate ? formatCustomDateDisplay(customDate, uni.id) : (uni.date || "TBA");
                    const daysRemaining = calculateDaysRemaining(customDate, uni.id);
                    const brandColorClass = getUniversityBrandColor(uni.id);

                    return (
                      <Card key={uni.id} className="overflow-hidden border transition-all duration-300 hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 group">
                        <div className="flex flex-col sm:flex-row">
                          {/* Left side info */}
                          <div className="p-5 flex-1 flex flex-row items-center gap-4">
                            <UniversityLogo
                              universityId={uni.id}
                              alt={`${uni.name} logo`}
                              className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 object-contain transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-lg sm:text-xl font-bold transition-colors duration-200 group-hover:text-primary">{uni.name}</CardTitle>
                              <div className="flex flex-wrap items-center gap-2.5 mt-2">
                                <p className={`text-sm sm:text-base font-semibold ${brandColorClass}`}>
                                  {displayDate}
                                </p>

                                {daysRemaining !== null && daysRemaining > 0 ? (
                                  <Badge 
                                    variant="outline" 
                                    className={`gap-1.5 shadow-xs py-1 transition-all ${
                                      daysRemaining < 7 
                                        ? "animate-pulse ring-2 ring-rose-500/60 border-rose-500 bg-rose-500/15 text-rose-600 dark:text-rose-400 font-extrabold shadow-rose-500/20" 
                                        : "bg-background"
                                    }`}
                                  >
                                    <Clock className={`h-3 w-3 ${daysRemaining < 7 ? "text-rose-500 animate-spin [animation-duration:3s]" : "text-rose-500 animate-pulse"}`} />
                                    <span className="text-xs font-semibold">{daysRemaining} days remaining {daysRemaining < 7 && "⚠️"}</span>
                                  </Badge>
                                ) : daysRemaining === 0 ? (
                                  <Badge variant="destructive" className="gap-1.5 shadow-xs py-1">
                                    <Clock className="h-3 w-3" />
                                    <span className="text-xs font-bold">Exam Today!</span>
                                  </Badge>
                                ) : daysRemaining !== null && daysRemaining < 0 ? (
                                  <Badge variant="secondary" className="gap-1.5 shadow-xs py-1">
                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs">Exam Passed</span>
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="gap-1.5 bg-background shadow-xs py-1">
                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs">TBA</span>
                                  </Badge>
                                )}

                                {uni.id !== 'upcat' && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingDateUni({ id: uni.id, name: uni.name, defaultDate: uni.date || 'TBA' })}
                                    className="h-7 text-xs px-2.5 font-medium gap-1 text-muted-foreground hover:text-foreground hover:bg-muted border border-border/50 rounded-md cursor-pointer"
                                    title="Set or update your specific exam date"
                                  >
                                    <Calendar className="h-3 w-3 text-primary" />
                                    <span>{customDate ? "Change Date" : "Set Date"}</span>
                                  </Button>
                                )}
                              </div>
                              {uni.description && (
                                <CardDescription className="mt-2 text-sm">
                                  {uni.description}
                                </CardDescription>
                              )}
                            </div>
                          </div>
                          
                          {/* Right side action */}
                          <div className="p-5 flex items-center justify-center bg-muted/30 sm:w-48 shrink-0 sm:border-l">
                            {isEditMode ? (
                              <div className="flex flex-col gap-2 w-full">
                                {uni.id !== 'upcat' && (
                                  <Button 
                                    variant="outline"
                                    size="sm" 
                                    className="w-full gap-1.5 text-xs h-8 font-semibold"
                                    onClick={() => setEditingDateUni({ id: uni.id, name: uni.name, defaultDate: uni.date || 'TBA' })}
                                  >
                                    <Calendar className="h-3.5 w-3.5 text-primary" />
                                    Edit Date
                                  </Button>
                                )}
                                <Button 
                                  variant="destructive"
                                  size="sm" 
                                  className="w-full gap-1.5 text-xs h-8 font-semibold shadow-xs transition-transform duration-200 active:scale-95"
                                  onClick={() => handleRemoveUniversity(uni.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Remove
                                </Button>
                              </div>
                            ) : (
                              <Link href={`/university/${uni.id}`} className="w-full">
                                <Button 
                                  size="default" 
                                  className="w-full gap-2 text-sm h-10 font-semibold shadow-xs transition-all duration-200 hover:scale-[1.02] active:scale-95 cursor-pointer group/btn"
                                >
                                  Study Now
                                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover/btn:translate-x-1" />
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>

            {/* Application Timelines section moved below My Universities */}
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold tracking-tight">Application Timelines</h2>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20 font-extrabold px-2.5 py-1 text-xs">
                    S.Y. 2027–2028
                  </Badge>
                </div>
                {(activeFilterCount > 0 || calendarFilters.search.trim().length > 0) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 font-medium"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Filters auto-saved to account</span>
                  </motion.div>
                )}
              </div>

              <Card className="border border-border bg-card shadow-sm overflow-hidden">
                <CardHeader className="pb-3 bg-muted/20 dark:bg-muted/10 border-b space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-indigo-500" />
                      <div>
                        <CardTitle className="text-sm font-bold">Admission Calendars</CardTitle>
                        <CardDescription className="text-xs">University application dates & deadlines for S.Y. 2027-2028</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Search Icon Button */}
                      <Button
                        size="sm"
                        variant={isSearchOpen || calendarFilters.search ? "default" : "outline"}
                        onClick={() => setIsSearchOpen((prev) => !prev)}
                        className="h-8 w-8 p-0 relative"
                        title="Search universities"
                        id="admission-search-toggle-btn"
                      >
                        <Search className="h-4 w-4" />
                        {calendarFilters.search && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-background" />
                        )}
                        <span className="sr-only">Search</span>
                      </Button>

                      {/* Filter Icon Button */}
                      <Button
                        size="sm"
                        variant={isFilterOpen || activeFilterCount > 0 ? "default" : "outline"}
                        onClick={() => setIsFilterOpen((prev) => !prev)}
                        className="h-8 w-8 p-0 relative"
                        title="Filter universities"
                        id="admission-filter-toggle-btn"
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                        {activeFilterCount > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center border border-background">
                            {activeFilterCount}
                          </span>
                        )}
                        <span className="sr-only">Filters</span>
                      </Button>

                      {/* Reset Button (visible when any filter or search active) */}
                      {(calendarFilters.search || activeFilterCount > 0) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleResetCalendarFilters}
                          className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                          title="Reset all filters"
                          id="admission-filters-reset-btn"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span className="sr-only">Reset Filters</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Expandable Search Bar */}
                  {isSearchOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="relative pt-1"
                    >
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        autoFocus
                        placeholder="Search university by name, abbreviation (e.g. ADU, BENILDE), or region..."
                        value={calendarFilters.search}
                        onChange={(e) => handleUpdateCalendarFilter("search", e.target.value)}
                        className="pl-9 pr-16 h-9 text-xs bg-background border-border shadow-none focus-visible:ring-indigo-500"
                        id="admission-search-input"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {calendarFilters.search && (
                          <button
                            onClick={() => handleUpdateCalendarFilter("search", "")}
                            className="p-1 text-muted-foreground hover:text-foreground rounded"
                            title="Clear search"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setIsSearchOpen(false)}
                          className="p-1 text-muted-foreground hover:text-foreground rounded"
                          title="Hide search"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Expandable Filter Box */}
                  {isFilterOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-3 rounded-lg border border-border/70 bg-background/80 backdrop-blur-xs space-y-2.5 pt-2"
                    >
                      <div className="flex items-center justify-between pb-1 border-b border-border/40">
                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                          <Filter className="h-3.5 w-3.5 text-indigo-500" />
                          <span>Filter Options</span>
                          {activeFilterCount > 0 && (
                            <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded-full">
                              {activeFilterCount} Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {activeFilterCount > 0 && (
                            <button
                              onClick={() => {
                                const resetWithoutSearch = { ...DEFAULT_CALENDAR_FILTERS, search: calendarFilters.search };
                                setCalendarFilters(resetWithoutSearch);
                                saveUserCalendarFilters(user, resetWithoutSearch);
                              }}
                              className="text-[11px] text-rose-500 hover:underline"
                            >
                              Clear filters
                            </button>
                          )}
                          <button
                            onClick={() => setIsFilterOpen(false)}
                            className="text-muted-foreground hover:text-foreground p-0.5 rounded"
                            title="Close filter panel"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                        {/* Institution Type */}
                        <div>
                          <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Type / Governance</label>
                          <select
                            value={calendarFilters.institutionType}
                            onChange={(e) => handleUpdateCalendarFilter("institutionType", e.target.value)}
                            className="w-full h-8 px-2 rounded-md border border-input bg-card text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                          >
                            <option value="all">All Types</option>
                            <option value="State University">State Universities (SUCs)</option>
                            <option value="Public">Public & Local Colleges</option>
                            <option value="Private">Private Universities</option>
                            <option value="Government Scholarship">Scholarships</option>
                          </select>
                        </div>

                        {/* Island Group */}
                        <div>
                          <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Island Group</label>
                          <select
                            value={calendarFilters.islandGroup}
                            onChange={(e) => handleUpdateCalendarFilter("islandGroup", e.target.value)}
                            className="w-full h-8 px-2 rounded-md border border-input bg-card text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                          >
                            <option value="all">All Islands</option>
                            <option value="Luzon">Luzon</option>
                            <option value="Visayas">Visayas</option>
                            <option value="Mindanao">Mindanao</option>
                          </select>
                        </div>

                        {/* Specific Region */}
                        <div>
                          <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Region</label>
                          <select
                            value={calendarFilters.region}
                            onChange={(e) => handleUpdateCalendarFilter("region", e.target.value)}
                            className="w-full h-8 px-2 rounded-md border border-input bg-card text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                          >
                            <option value="all">All Regions</option>
                            <option value="NCR">NCR (Metro Manila)</option>
                            <option value="Region III">Region III (Central Luzon)</option>
                            <option value="Region IV-A">Region IV-A (CALABARZON)</option>
                            <option value="Region V">Region V (Bicol)</option>
                            <option value="Region VII">Region VII (Central Visayas)</option>
                            <option value="Region VIII">Region VIII (Eastern Visayas)</option>
                            <option value="Region XI">Region XI (Davao Region)</option>
                          </select>
                        </div>

                        {/* League / Category */}
                        <div>
                          <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">League / Group</label>
                          <select
                            value={calendarFilters.category}
                            onChange={(e) => handleUpdateCalendarFilter("category", e.target.value)}
                            className="w-full h-8 px-2 rounded-md border border-input bg-card text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                          >
                            <option value="all">All Leagues</option>
                            <option value="big4">Big 4 Universities</option>
                            <option value="uaap">UAAP Schools</option>
                            <option value="ncaa">NCAA Schools</option>
                          </select>
                        </div>

                        {/* Open Month */}
                        <div>
                          <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Opens In</label>
                          <select
                            value={calendarFilters.openMonth}
                            onChange={(e) => handleUpdateCalendarFilter("openMonth", e.target.value)}
                            className="w-full h-8 px-2 rounded-md border border-input bg-card text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                          >
                            <option value="all">Any Open Month</option>
                            <option value="6">June</option>
                            <option value="7">July</option>
                            <option value="8">August</option>
                            <option value="9">September</option>
                            <option value="10">October</option>
                            <option value="11">November</option>
                            <option value="12">December</option>
                          </select>
                        </div>

                        {/* Close Month */}
                        <div>
                          <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Closes In</label>
                          <select
                            value={calendarFilters.closeMonth}
                            onChange={(e) => handleUpdateCalendarFilter("closeMonth", e.target.value)}
                            className="w-full h-8 px-2 rounded-md border border-input bg-card text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                          >
                            <option value="all">Any Close Month</option>
                            <option value="8">August</option>
                            <option value="9">September</option>
                            <option value="10">October</option>
                            <option value="11">November</option>
                            <option value="12">December</option>
                            <option value="1">January</option>
                            <option value="3">March</option>
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Active Filter Chips (shown when panel is closed and filters exist) */}
                  {!isFilterOpen && (activeFilterCount > 0 || calendarFilters.search) && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-[11px]">
                      <span className="text-muted-foreground font-medium text-[10px] uppercase">Active:</span>
                      {calendarFilters.search && (
                        <Badge variant="secondary" className="gap-1 font-normal py-0.5 px-2 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20">
                          Search: "{calendarFilters.search}"
                          <button onClick={() => handleUpdateCalendarFilter("search", "")} className="hover:opacity-75">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )}
                      {calendarFilters.institutionType !== "all" && (
                        <Badge variant="secondary" className="gap-1 font-normal py-0.5 px-2">
                          Type: {calendarFilters.institutionType}
                          <button onClick={() => handleUpdateCalendarFilter("institutionType", "all")} className="hover:opacity-75">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )}
                      {calendarFilters.islandGroup !== "all" && (
                        <Badge variant="secondary" className="gap-1 font-normal py-0.5 px-2">
                          Island: {calendarFilters.islandGroup}
                          <button onClick={() => handleUpdateCalendarFilter("islandGroup", "all")} className="hover:opacity-75">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )}
                      {calendarFilters.region !== "all" && (
                        <Badge variant="secondary" className="gap-1 font-normal py-0.5 px-2">
                          Region: {calendarFilters.region}
                          <button onClick={() => handleUpdateCalendarFilter("region", "all")} className="hover:opacity-75">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )}
                      {calendarFilters.category !== "all" && (
                        <Badge variant="secondary" className="gap-1 font-normal py-0.5 px-2">
                          Group: {calendarFilters.category === "big4" ? "Big 4" : calendarFilters.category.toUpperCase()}
                          <button onClick={() => handleUpdateCalendarFilter("category", "all")} className="hover:opacity-75">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )}
                      {calendarFilters.openMonth !== "all" && (
                        <Badge variant="secondary" className="gap-1 font-normal py-0.5 px-2">
                          Opens: Month {calendarFilters.openMonth}
                          <button onClick={() => handleUpdateCalendarFilter("openMonth", "all")} className="hover:opacity-75">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )}
                      {calendarFilters.closeMonth !== "all" && (
                        <Badge variant="secondary" className="gap-1 font-normal py-0.5 px-2">
                          Closes: Month {calendarFilters.closeMonth}
                          <button onClick={() => handleUpdateCalendarFilter("closeMonth", "all")} className="hover:opacity-75">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-4">
                  {visibleTimelines.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No active university application periods.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {visibleTimelines.map((item) => {
                        const today = new Date();
                        const hasOpened = today >= item.openDate;
                        const daysUntilClose = item.closeDate ? Math.ceil((item.closeDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
                        const isClosingSoon = daysUntilClose !== null && daysUntilClose <= 15 && daysUntilClose >= 0;
                        const isCritical = daysUntilClose !== null && daysUntilClose <= 7 && daysUntilClose >= 0;

                        return (
                          <div key={item.id} className={`p-3.5 rounded-lg border bg-muted/10 space-y-2 flex flex-col justify-between transition-all ${
                            isCritical
                              ? "border-rose-500/50 ring-1 ring-rose-500/30 bg-rose-500/5"
                              : isClosingSoon
                              ? "border-amber-500/50 ring-1 ring-amber-500/30 bg-amber-500/5"
                              : "border-muted-foreground/10"
                          }`}>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-extrabold uppercase tracking-wider text-foreground">
                                  {item.shortName || item.id.toUpperCase()}
                                </span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold shrink-0 ${
                                  isCritical
                                    ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40 animate-pulse"
                                    : isClosingSoon
                                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40"
                                    : hasOpened 
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" 
                                    : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
                                }`}>
                                  {isClosingSoon 
                                    ? `Closing in ${daysUntilClose} ${daysUntilClose === 1 ? 'day' : 'days'}!` 
                                    : hasOpened ? "Applications Open" : "Opening Soon"}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-muted-foreground">
                                {item.fullName}
                              </p>
                              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-muted/30 text-[11px]">
                                <div>
                                  <span className="text-muted-foreground block text-[10px] uppercase">Open Date</span>
                                  <span className="font-semibold text-foreground">{item.openStr}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block text-[10px] uppercase">Close Date</span>
                                  <span className="font-semibold text-foreground">{item.closeStr}</span>
                                </div>
                              </div>
                            </div>
                            {item.applyUrl && (
                              <div className="pt-2 border-t border-muted/30 mt-2">
                                <a
                                  href={item.applyUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block w-full"
                                >
                                  <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs font-semibold h-8 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 transition-transform duration-200 hover:scale-105 active:scale-95 cursor-pointer">
                                    Apply Now
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </Button>
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!authLoading && !user && !dismissedWarning} onOpenChange={(open) => {
        if (!open) {
          handleContinueAnyway();
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="flex flex-col items-center text-center sm:text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-500">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl font-bold">Sign in to Save Your Progress</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground max-w-xs sm:max-w-none text-center">
              If you don't sign in, the questions might not sync across your devices or you won't be able to access your past sessions to view your progress.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleContinueAnyway}
              className="w-full sm:flex-1 h-10 font-semibold cursor-pointer"
            >
              Continue anyway
            </Button>
            <Button
              type="button"
              onClick={async () => {
                try {
                  await signInWithGoogle();
                } catch (e) {
                  console.error(e);
                }
              }}
              className="w-full sm:flex-1 h-10 gap-2 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer flex items-center justify-center"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Plus className="h-5 w-5 text-primary" />
              Add University
            </DialogTitle>
            <DialogDescription>
              Choose a university to add to your personalized study goals. You can set your specific exam date now or update it anytime later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 my-3 max-h-[60vh] overflow-y-auto pr-1">
            {UNIVERSITIES.map((uni) => {
              const isAdded = addedUniIds.includes(uni.id);
              const customDate = userExamDates[uni.id];
              const draftDate = addDialogDates[uni.id] ?? "";
              const isExpanded = expandedAddDateUni === uni.id;

              return (
                <div key={uni.id} className="p-3.5 rounded-lg border bg-muted/20 hover:bg-muted/30 transition-all duration-200 space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <UniversityLogo
                        universityId={uni.id}
                        alt={`${uni.name} logo`}
                        className="h-10 w-10 shrink-0 object-contain"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-foreground leading-snug">{uni.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {customDate ? `Exam: ${formatCustomDateDisplay(customDate)}` : (uni.date ? `Schedule: ${uni.date}` : "Schedule: TBA")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isAdded ? (
                        <Button 
                          size="sm" 
                          variant="default"
                          className="font-semibold h-8 text-xs cursor-pointer shadow-xs transition-transform active:scale-95 gap-1.5"
                          onClick={async () => {
                            const newIds = [...addedUniIds, uni.id];
                            setAddedUniIds(newIds);
                            await saveUserAddedUniversities(user, newIds);
                            
                            if (draftDate.trim()) {
                              await saveSingleExamDate(user, uni.id, draftDate.trim());
                            }
                            
                            toast({
                              title: "University Added",
                              description: draftDate.trim() 
                                ? `${uni.name} added with exam date: ${formatCustomDateDisplay(draftDate)}.` 
                                : `${uni.name} has been added to your target universities.`,
                            });
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {uni.id !== 'upcat' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="font-semibold h-8 text-xs gap-1 cursor-pointer"
                              onClick={() => {
                                setAddDialogOpen(false);
                                setEditingDateUni({ id: uni.id, name: uni.name, defaultDate: uni.date || "TBA" });
                              }}
                            >
                              <Calendar className="h-3.5 w-3.5 text-primary" />
                              {customDate ? "Edit Date" : "Set Date"}
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="font-semibold h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                            onClick={() => handleRemoveUniversity(uni.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Optional Specific Exam Date Input when adding or modifying */}
                  {!isAdded && uni.id !== 'upcat' && (
                    <div className="pt-2 border-t border-muted/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>Set exam date (optional):</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          value={draftDate}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAddDialogDates((prev) => ({ ...prev, [uni.id]: val }));
                          }}
                          className="h-7 w-36 text-xs"
                          placeholder="Select date"
                        />
                        {draftDate && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setAddDialogDates((prev) => ({ ...prev, [uni.id]: "" }))}
                            className="h-7 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter className="sm:justify-between items-center text-xs text-muted-foreground pt-2">
            <span>You can adjust your exam date at any time on the dashboard.</span>
            <Button variant="outline" size="sm" onClick={() => setAddDialogOpen(false)} className="text-xs">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reusable Set Exam Date Dialog */}
      {editingDateUni && (
        <SetExamDateDialog
          open={Boolean(editingDateUni)}
          onOpenChange={(open) => {
            if (!open) setEditingDateUni(null);
          }}
          universityId={editingDateUni.id}
          universityName={editingDateUni.name}
          currentDate={userExamDates[editingDateUni.id] || ""}
          defaultDate={editingDateUni.defaultDate}
          onSaveDate={async (newDateStr) => {
            await saveSingleExamDate(user, editingDateUni.id, newDateStr);
            toast({
              title: newDateStr ? "Exam Date Updated" : "Exam Date Reset",
              description: newDateStr 
                ? `Exam date for ${editingDateUni.name} set to ${formatCustomDateDisplay(newDateStr)}.`
                : `Exam date for ${editingDateUni.name} reset to default/TBA.`,
            });
          }}
        />
      )}
    </Layout>
  );
}
