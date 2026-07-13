import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, GraduationCap, Plus, ArrowRight, AlertTriangle, Flame } from "lucide-react";
import { useUpcatCountdown } from "@/hooks/useCountdown";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { listSessions } from "@/lib/firestoreSessions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const UNIVERSITIES = [
  { 
    id: 'upcat', 
    name: 'University of the Philippines - (UPCAT 2027)', 
    date: 'August 1-2, 2026',
    description: ''
  }
];

export default function Dashboard() {
  const { toast } = useToast();
  const upcatDaysLeft = useUpcatCountdown();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [streak, setStreak] = useState(0);
  const [animateTrigger, setAnimateTrigger] = useState(0);
  const [dismissedWarning, setDismissedWarning] = useState(() => {
    return localStorage.getItem("kolehiyotrack_dismissed_auth_warning") === "true";
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
          
          let expectedStr = todayStr;
          if (uniqueDates.includes(todayStr)) {
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
    }
  }, [user]);

  const getFlameStyles = () => {
    if (!user || streak === 0) {
      return {
        container: "bg-muted text-muted-foreground",
        icon: "w-8 h-8",
        label: "Start your streak today!",
        badgeColor: "bg-muted text-muted-foreground text-[10px]"
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

  const handleAddUniversity = () => {
    toast({
      title: "Coming Soon",
      description: "More universities will be added in a future update.",
    });
  };

  return (
    <Layout>
      <div className="space-y-8 max-w-5xl mx-auto w-full">
        <div className="space-y-4 text-center py-8">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column: Daily Streak */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">Daily Streak</h2>
            <Card className="border-2 border-orange-500/20 bg-orange-500/5 dark:bg-orange-500/10 shadow-sm overflow-hidden relative">
              <CardContent className="p-5 flex flex-col items-center justify-center text-center space-y-3">
                <div 
                  key={animateTrigger}
                  className={`p-2.5 rounded-full transition-all duration-500 animate-pop-flame ${flameStyle.container}`}
                >
                  <Flame className={flameStyle.icon} strokeWidth={1.5} />
                </div>
                {user ? (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <div className="text-3xl font-bold tracking-tight text-foreground">
                        {streak}
                      </div>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Day Streak
                      </div>
                    </div>
                    <Badge variant="secondary" className={`text-[10px] font-semibold py-0.5 px-2.5 ${flameStyle.badgeColor}`}>
                      {flameStyle.label}
                    </Badge>
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
          </div>

          {/* Right Column: My Universities */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight">My Universities</h2>
              <Button onClick={handleAddUniversity} className="gap-2">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>

            <div className="grid gap-4">
              {UNIVERSITIES.map((uni) => (
                <Card key={uni.id} className="overflow-hidden border transition-all hover:border-primary/50 shadow-sm">
                  <div className="flex flex-col sm:flex-row">
                    {/* Left side info */}
                    <div className="p-5 flex-1 flex flex-row items-center gap-4">
                      <img 
                        src={`${import.meta.env.BASE_URL}up-logo.png`} 
                        alt="UP logo" 
                        className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 object-contain" 
                      />
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg sm:text-xl font-bold">{uni.name}</CardTitle>
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          <p className="text-sm sm:text-base font-semibold text-primary">
                            {uni.date || "TBA"}
                          </p>
                          {uni.id === 'upcat' ? (
                            <Badge variant="outline" className="gap-1.5 bg-background shadow-sm py-1">
                              <Clock className="h-3 w-3 text-rose-500 animate-pulse" />
                              <span className="text-xs">{upcatDaysLeft} days remaining</span>
                            </Badge>
                          ) : uni.date ? (
                            <Badge variant="outline" className="gap-1.5 bg-background shadow-sm py-1">
                              <Clock className="h-3 w-3 text-primary" />
                              <span className="text-xs">{uni.date}</span>
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1.5 bg-background shadow-sm py-1">
                              <Clock className="h-3 w-3 text-primary" />
                              <span className="text-xs">TBA</span>
                            </Badge>
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
                      <Link href={`/university/${uni.id}`} className="w-full">
                        <Button 
                          size="default" 
                          className="w-full gap-2 text-sm h-10 font-semibold shadow-sm"
                        >
                          Study Now
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
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
    </Layout>
  );
}
