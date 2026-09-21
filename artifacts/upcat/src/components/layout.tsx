import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { motion } from "framer-motion";
import { getLocalAddedUniversities, subscribeUserAddedUniversities, saveUserAddedUniversities, getLocalExamDates, subscribeUserExamDates, calculateDaysRemaining, TRACKED_UNIVERSITIES } from "@/lib/userUniversities";
import { getActiveApplicationTimelines, STUDY_TIPS_POOL } from "@/lib/applicationTimelines";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LogIn, LogOut, Sun, Moon, Menu, Plus, Home, Book, X, History, BrainCircuit, Settings, Bell, Sparkles, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { CURRENT_VERSION, CHANGELOG_DATA } from "../config/changelog";
import { getLocalMistakes } from "@/lib/mistakeDiary";
import { AIAutoSwitchNotification } from "@/components/AILimitCounter";
import { AIOnboardingModal } from "@/components/AIOnboardingModal";
import { SettingsModal } from "@/components/SettingsModal";
import { UniversityLogo } from "@/components/UniversityLogo";

const UNIVERSITIES = TRACKED_UNIVERSITIES;

export function Layout({ children, hideSidebar = false }: { children: React.ReactNode; hideSidebar?: boolean }) {
  const { user, loading, signInWithGoogle, signOutUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"general" | "ai" | "feedback" | "about">("general");
  const [location] = useLocation();

  const [addedUniIds, setAddedUniIds] = useState<string[]>(() => getLocalAddedUniversities());
  const [userExamDates, setUserExamDates] = useState<Record<string, string>>(() => getLocalExamDates());
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [tickerCycle, setTickerCycle] = useState(0);

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

  const activeTimelines = getActiveApplicationTimelines();
  const filteredUniversities = UNIVERSITIES.filter(uni => addedUniIds.includes(uni.id));

  const tickerItems = useMemo(() => {
    const items: string[] = [];

    // 0. Urgent Official Announcements
    items.push(`🚨 The University of the Philippines (UP) has EXTENDED, for the third time, the deadline for submission of grades for Academic Year 2027-2028. The new deadline is set on September 21, 2026.`);
    items.push(`📢 DOST-SEI Scholarship application deadline extended to September 24, 2026.`);
    items.push(`📢 Ateneo de Davao University (ADDU) is now accepting online applications for AY 2027-2028.`);
    items.push(`📢 Kolehiyo ng Lungsod ng Dasmariñas (KLD) opens applications from Sept 21 to Oct 2, 2026.`);
    items.push(`📢 Adamson University (AdU) application open: Sept 17 - TBA.`);
    items.push(`📢 DLSU-Benilde application period: Sept 15, 2026 - March 17, 2027.`);

    // 1. Live open applications (past due applications are automatically filtered out!)
    activeTimelines.slice(0, 12).forEach((app) => {
      items.push(`📢 Application for ${app.fullName} (${app.shortName || app.id.toUpperCase()}): ${app.openStr}${app.closeStr && app.closeStr !== 'TBA' ? ` – ${app.closeStr}` : ''}`);
    });

    // 2. Dynamic live countdowns synced with user's set dates (or default dates)
    filteredUniversities.forEach((uni) => {
      const customDate = userExamDates[uni.id];
      const days = calculateDaysRemaining(customDate, uni.id);
      if (days !== null && days > 0) {
        items.push(`⏳ ${days} days until exam for ${uni.name.split(' - ')[0]} (${uni.shortName})`);
      }
    });

    // 3. Dynamic Rotating Tip
    const randomTip = STUDY_TIPS_POOL[Math.floor(Math.random() * STUDY_TIPS_POOL.length)] || STUDY_TIPS_POOL[0];
    items.push(`💡 Tips: ${randomTip}`);

    // 4. Feature updates item
    items.push(`🚀 ${CURRENT_VERSION}: Live calendar countdowns, smart filters & prompt copying`);

    // 5. Permanent social media handle
    items.push(`📱 Follow our social media pages: @kolehiyotrack on TikTok`);

    return items;
  }, [userExamDates, filteredUniversities, tickerCycle]);

  return (
    <div className="min-h-[100dvh] flex bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      {!hideSidebar && (
        <>
          {/* Mobile Overlay */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 z-40 bg-black/80 md:hidden" 
              onClick={() => setSidebarOpen(false)}
            />
          )}
          <aside
            className={cn(
              "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transition-transform duration-300 ease-in-out flex flex-col md:translate-x-0",
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}
          >
            <div className="flex items-center justify-between h-16 px-4 border-b">
              <Link href="/" className="flex items-center gap-3 font-bold text-lg text-primary transition-colors hover:text-primary/80">
                <img src={`${import.meta.env.BASE_URL}logo.png`} alt="KolehiyoTrack" className="h-8 w-8 object-contain" />
                <span>KolehiyoTrack</span>
              </Link>
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto py-4">
              <nav className="space-y-1 px-2">
                <Link href="/">
                  <span className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer", location === '/' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                    <Home className="h-4 w-4" />
                    Home
                  </span>
                </Link>

                <Link href="/mistakes">
                  <span className={cn("flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer", location === '/mistakes' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                    <div className="flex items-center gap-3">
                      <BrainCircuit className="h-4 w-4 text-amber-500" />
                      <span>Mistake Diary</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                      AI Log
                    </span>
                  </span>
                </Link>
              </nav>
              
              <div className="mt-8 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>My Universities</span>
                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full cursor-pointer hover:bg-muted" title="Add University">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                        <Plus className="h-5 w-5 text-primary" />
                        Add University
                      </DialogTitle>
                      <DialogDescription>
                        Select a university to add to your list of active study goals.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-3 my-4">
                      {UNIVERSITIES.map(uni => {
                        const isAdded = addedUniIds.includes(uni.id);
                        return (
                          <div key={uni.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                            <div className="flex items-center gap-3">
                              <UniversityLogo
                                universityId={uni.id}
                                alt={`${uni.shortName} logo`}
                                className="h-10 w-10 shrink-0 object-contain"
                              />
                              <div>
                                <h4 className="text-sm font-bold text-foreground">{uni.shortName}</h4>
                                <p className="text-xs text-muted-foreground">{uni.date}</p>
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              variant={isAdded ? "outline" : "default"}
                              disabled={isAdded}
                              onClick={() => {
                                const newIds = [...addedUniIds, uni.id];
                                setAddedUniIds(newIds);
                                saveUserAddedUniversities(user, newIds);
                                setAddDialogOpen(false);
                              }}
                            >
                              {isAdded ? "Added" : "Add"}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <nav className="space-y-2 px-2 py-1">
                {filteredUniversities.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground/60 px-3 py-2 italic text-center">
                    No universities added. Click "+" above to add.
                  </p>
                ) : (
                  filteredUniversities.map(uni => {
                    const isUP = uni.id === 'upcat';
                    const isAteneo = uni.id === 'ateneo';
                    const isDLSU = uni.id === 'dlsu';
                    const isUST = uni.id === 'ust';
                    const isBU = uni.id === 'bu';
                    const isActive = location === `/university/${uni.id}`;
                    
                    let itemClass = "text-muted-foreground hover:bg-muted hover:text-foreground border-transparent";
                    if (isUP) {
                      itemClass = "bg-[#7b1113] text-white border-[#921416] hover:bg-[#8c1315]";
                    } else if (isAteneo) {
                      itemClass = "bg-[#003366] text-white border-[#004080] hover:bg-[#00264d]";
                    } else if (isDLSU) {
                      itemClass = "bg-[#00703c] text-white border-[#008547] hover:bg-[#005a30]";
                    } else if (isUST) {
                      itemClass = "bg-[#d97706] dark:bg-[#b45309] text-white border-[#f59e0b] hover:bg-[#b45309] dark:hover:bg-[#92400e]";
                    } else if (isBU) {
                      itemClass = "bg-[#009cb8] text-white border-[#00adc3] hover:bg-[#008ba5]";
                    } else if (isActive) {
                      itemClass = "bg-primary text-primary-foreground border-primary";
                    }

                    return (
                      <Link key={uni.id} href={`/university/${uni.id}`}>
                        <span 
                          title={uni.name}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3.5 py-2.5 transition-all cursor-pointer shadow-xs border text-xs font-semibold whitespace-nowrap overflow-hidden hover:scale-[1.01] active:scale-[0.99] min-h-[42px]",
                            itemClass
                          )}
                        >
                          <UniversityLogo
                            universityId={uni.id}
                            alt={`${uni.shortName} logo`}
                            className="h-5 w-5 shrink-0 object-contain"
                          />
                          <span className="truncate flex-1 text-[12.5px] font-bold tracking-tight">{uni.name}</span>
                        </span>
                      </Link>
                    );
                  })
                )}
              </nav>
            </div>

            {/* Sidebar Footer with Changelog and Version */}
            <div className="p-4 border-t bg-card/50 flex flex-col gap-2.5 mt-auto shrink-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/85 px-1 block pt-1">
                Visit our social media pages
              </span>
              <a 
                href="https://www.tiktok.com/@kolehiyotrack" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-muted text-xs text-muted-foreground hover:text-foreground transition-all border border-transparent hover:border-border/40"
              >
                <svg className="w-3.5 h-3.5 shrink-0 fill-current text-foreground" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.01 1.62 4.14.99 1.13 2.37 1.84 3.86 2.03v3.83a8.87 8.87 0 0 1-5.11-1.84v6.86a7.28 7.28 0 0 1-2.13 5.16 7.28 7.28 0 0 1-5.16 2.13 7.28 7.28 0 0 1-5.16-2.13A7.28 7.28 0 0 1 2.35 13a7.28 7.28 0 0 1 2.13-5.16A7.28 7.28 0 0 1 9.64 5.7c.07.13.14.26.22.4.67 1.15 1.66 2.06 2.87 2.64V.02zm0 0"/>
                </svg>
                <span className="font-semibold">@kolehiyotrack</span>
              </a>
              <div className="flex items-center justify-between">
              <Dialog open={changelogOpen} onOpenChange={setChangelogOpen}>
                <DialogTrigger asChild>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="inline-block">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 px-2 py-1.5 h-auto rounded-md cursor-pointer transition-colors"
                    >
                      <History className="h-3.5 w-3.5" />
                      Changelog
                    </Button>
                  </motion.div>
                </DialogTrigger>
                <DialogContent className="max-w-md md:max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                      <History className="h-5 w-5 text-primary" />
                      What's New in KolehiyoTrack
                    </DialogTitle>
                    <DialogDescription>
                      Version {CURRENT_VERSION} — Latest Updates & Changes
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 my-3 max-h-[60vh] overflow-y-auto pr-1">
                    {CHANGELOG_DATA.map((item) => (
                      <div 
                        key={item.version} 
                        className={cn(
                          "space-y-2 border-l-2 pl-4 py-1",
                          item.isCurrent || item.version === CURRENT_VERSION
                            ? "border-[#7b1113]" 
                            : "border-muted"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-foreground">Version {item.version}</span>
                          {(item.isCurrent || item.version === CURRENT_VERSION) && (
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded font-medium">Current</span>
                          )}
                        </div>
                        <p className="text-[10px] font-medium text-muted-foreground">{item.date}</p>
                        <ul className="text-xs space-y-1.5 list-disc pl-4 text-muted-foreground leading-relaxed">
                          {item.changes.map((change, idx) => (
                            <li key={idx}>
                              <strong className="text-foreground">{change.title}:</strong> {change.description}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <DialogFooter className="sm:justify-end">
                    <DialogClose asChild>
                      <Button variant="secondary" size="sm">
                        Close
                      </Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <div className="text-[11px] font-mono font-bold text-muted-foreground bg-muted border px-2.5 py-1 rounded-md shadow-sm select-none">
                {CURRENT_VERSION}
              </div>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Main Content */}
      <div className={cn("flex-1 flex flex-col min-w-0", !hideSidebar && "md:pl-64")}>
        <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center px-4 md:px-6 gap-3">
            {!hideSidebar && (
              <Button
                variant="ghost"
                size="icon"
                className="mr-1 md:hidden shrink-0"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}

            {/* Rolling Announcement Ticker */}
            <div className="flex-1 min-w-0 max-w-2xl mx-auto hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/40 hover:bg-muted/70 border border-border/70 text-xs overflow-hidden transition-colors">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="shrink-0 flex">
                <button
                  type="button"
                  onClick={() => setChangelogOpen(true)}
                  className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full bg-primary/15 text-primary font-bold text-[10.5px] tracking-wide uppercase hover:bg-primary/25 transition-colors cursor-pointer shadow-2xs"
                  title="View full updates & timeline"
                >
                  <Megaphone className="h-3 w-3 text-primary animate-pulse" />
                  <span>Updates</span>
                </button>
              </motion.div>

              <div 
                onClick={() => setChangelogOpen(true)} 
                className="overflow-hidden whitespace-nowrap cursor-pointer flex-1 relative mask-fade-edges"
                title="Click to view update details and application timelines"
              >
                <div 
                  className="animate-marquee inline-flex items-center gap-8 text-muted-foreground hover:text-foreground transition-colors font-medium text-[11.5px]"
                  onAnimationIteration={() => setTickerCycle((c) => c + 1)}
                >
                  {tickerItems.concat(tickerItems).map((item, idx) => (
                    <span key={idx} className="inline-flex items-center gap-8">
                      <span>{item}</span>
                      <span className="text-muted-foreground/40">•</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="ml-auto flex items-center space-x-2 sm:space-x-3 shrink-0">
              {/* Settings Button - Enlarged and Prominent */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSettingsTab("general");
                  setSettingsOpen(true);
                }}
                aria-label="Open Settings"
                title="Settings & Preferences (Appearance, AI Engines, Feedback)"
                className="h-9 px-3 gap-1.5 rounded-lg border-border/80 text-foreground font-semibold hover:bg-muted/80 hover:text-primary transition-all cursor-pointer shadow-xs"
              >
                <Settings className="h-4.5 w-4.5 text-primary" />
                <span className="text-xs hidden sm:inline">Settings</span>
              </Button>

              {!loading && (
                user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.photoURL ?? undefined} alt={user.displayName ?? "User"} />
                          <AvatarFallback className="text-xs">
                            {user.displayName?.charAt(0) ?? user.email?.charAt(0) ?? "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="hidden sm:block text-sm font-medium text-foreground max-w-[120px] truncate">
                          {user.displayName ?? user.email}
                        </span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuLabel className="font-normal">
                        <p className="text-sm font-medium leading-none truncate">{user.displayName}</p>
                        <p className="text-xs text-muted-foreground mt-1 truncate">{user.email}</p>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={signOutUser} className="text-destructive focus:text-destructive cursor-pointer">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={signInWithGoogle}
                    className="gap-2"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span className="hidden sm:inline">Sign in with Google</span>
                    <span className="sm:hidden">
                      <LogIn className="h-4 w-4" />
                    </span>
                  </Button>
                )
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 flex flex-col overflow-y-auto">
          <div className="container mx-auto px-4 md:px-6 py-8 max-w-6xl flex-1 flex flex-col">
            {children}
          </div>
        </main>
        <SettingsModal
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          defaultTab={settingsTab}
        />
        <AIOnboardingModal />
        <AIAutoSwitchNotification />
      </div>
    </div>
  );
}
