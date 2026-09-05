import React, { useState, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useAIQuota } from "@/lib/aiQuota";
import { 
  AIProvider, 
  AI_PROVIDERS, 
  isAutoSwitchAIEnabled, 
  setAutoSwitchAIEnabled, 
  setActiveAIProvider,
  getActiveAIProvider,
  getStoredApiKeyForProvider,
  saveStoredApiKeyForProvider,
} from "@/lib/geminiKey";
import { testAIProviderConnection } from "@/lib/geminiClientService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Settings,
  Sun,
  Moon,
  Laptop,
  MessageSquare,
  Sparkles,
  Zap,
  Key,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Check,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  XCircle,
  HelpCircle,
  Palette,
  Sliders,
  BellRing,
  BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APIKeyTutorialModal } from "@/components/APIKeyTutorialModal";

const PROVIDER_LIST: AIProvider[] = ["gemini", "groq", "openai", "openrouter", "deepseek"];

interface SettingsModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultTab?: "general" | "ai" | "feedback" | "about";
}

export function SettingsModal({
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  defaultTab = "general",
}: SettingsModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = setControlledOpen || setInternalOpen;

  const [activeTab, setActiveTab] = useState<"general" | "ai" | "feedback" | "about">(defaultTab);
  const { theme, toggleTheme } = useTheme();
  const quota = useAIQuota();

  // Font size / study preference state
  const [highContrast, setHighContrast] = useState(() => {
    return localStorage.getItem("kt-high-contrast") === "true";
  });
  const [autoAdvanceQuiz, setAutoAdvanceQuiz] = useState(() => {
    return localStorage.getItem("kt-auto-advance") === "true";
  });
  const [soundEffects, setSoundEffects] = useState(() => {
    return localStorage.getItem("kt-sound-fx") !== "false";
  });

  // AI Tab states
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [autoSwitch, setAutoSwitch] = useState(quota.autoSwitchEnabled);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(getActiveAIProvider());
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (defaultTab) setActiveTab(defaultTab);
      const active = getActiveAIProvider();
      setSelectedProvider(active);
      setApiKey(getStoredApiKeyForProvider(active));
      setSavedSuccess(false);
      setTestResult(null);
      setAutoSwitch(quota.autoSwitchEnabled);
    }
  }, [isOpen, defaultTab, quota.autoSwitchEnabled]);

  const handleToggleAutoSwitch = () => {
    const nextVal = !autoSwitch;
    setAutoSwitch(nextVal);
    setAutoSwitchAIEnabled(nextVal);
  };

  const handleQuickSwitch = (provider: AIProvider) => {
    setActiveAIProvider(provider);
    setSelectedProvider(provider);
    setApiKey(getStoredApiKeyForProvider(provider));
  };

  const handleSelectProvider = (prov: AIProvider) => {
    setSelectedProvider(prov);
    setApiKey(getStoredApiKeyForProvider(prov));
    setTestResult(null);
    setSavedSuccess(false);
  };

  const cleanKeyInput = (raw: string) => {
    return raw.trim().replace(/^["'`]|["'`]$/g, "").trim();
  };

  const handleTestKey = async () => {
    const cleanKey = cleanKeyInput(apiKey);
    if (!cleanKey) {
      setTestResult({
        success: false,
        message: `Please enter an API key for ${AI_PROVIDERS[selectedProvider].name} first.`,
      });
      return;
    }

    setTestingKey(true);
    setTestResult(null);

    try {
      const res = await testAIProviderConnection(selectedProvider, cleanKey);
      setTestResult(res);
      if (res.success) {
        saveStoredApiKeyForProvider(selectedProvider, cleanKey);
        setActiveAIProvider(selectedProvider);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Connection failed: ${err?.message || "Check your internet connection."}`,
      });
    } finally {
      setTestingKey(false);
    }
  };

  const handleSaveKey = () => {
    const trimmed = cleanKeyInput(apiKey);
    saveStoredApiKeyForProvider(selectedProvider, trimmed);
    if (trimmed) {
      setActiveAIProvider(selectedProvider);
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 1500);
  };

  const handleClearKey = () => {
    saveStoredApiKeyForProvider(selectedProvider, "");
    setApiKey("");
    setSavedSuccess(true);
    setTestResult(null);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 1200);
  };

  const handleToggleContrast = () => {
    const next = !highContrast;
    setHighContrast(next);
    localStorage.setItem("kt-high-contrast", String(next));
    if (next) {
      document.documentElement.classList.add("contrast-more");
    } else {
      document.documentElement.classList.remove("contrast-more");
    }
  };

  const handleToggleAutoAdvance = () => {
    const next = !autoAdvanceQuiz;
    setAutoAdvanceQuiz(next);
    localStorage.setItem("kt-auto-advance", String(next));
  };

  const handleToggleSounds = () => {
    const next = !soundEffects;
    setSoundEffects(next);
    localStorage.setItem("kt-sound-fx", String(next));
  };

  const {
    used,
    total,
    remaining,
    resetTimeStr,
    isExhausted,
    isLow,
    percentage,
    hasCustomKey,
    providerName,
    providerId,
    candidates = [],
  } = quota;

  const currentMeta = AI_PROVIDERS[selectedProvider];
  const hasKeyForSelected = Boolean(getStoredApiKeyForProvider(selectedProvider));

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border border-border shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Settings & Preferences
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Configure appearance, AI assistant engines, study mode, and app preferences
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content Area with Vertical Navigation on larger screens */}
        <div className="flex flex-col sm:flex-row flex-1 overflow-hidden min-h-[380px]">
          {/* Navigation Sidebar */}
          <div className="w-full sm:w-48 border-b sm:border-b-0 sm:border-r border-border bg-muted/10 p-2 sm:p-3 flex sm:flex-col gap-1 shrink-0 overflow-x-auto sm:overflow-x-visible">
            <button
              type="button"
              onClick={() => setActiveTab("general")}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors text-left shrink-0 cursor-pointer w-full",
                activeTab === "general"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Palette className="h-4 w-4 shrink-0" />
              <span>Appearance & UI</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("ai")}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors text-left shrink-0 cursor-pointer w-full",
                activeTab === "ai"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Zap className="h-4 w-4 shrink-0 text-amber-500" />
              <span>AI Configuration</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("feedback")}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors text-left shrink-0 cursor-pointer w-full",
                activeTab === "feedback"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              <span>Feedback & Bugs</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("about")}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors text-left shrink-0 cursor-pointer w-full",
                activeTab === "about"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <HelpCircle className="h-4 w-4 shrink-0" />
              <span>About & System</span>
            </button>
          </div>

          {/* Tab Content Panel */}
          <div className="flex-1 p-5 overflow-y-auto space-y-5">
            {/* TAB 1: GENERAL & APPEARANCE */}
            {activeTab === "general" && (
              <div className="space-y-5 animate-in fade-in-50">
                {/* Theme Mode Selector */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Palette className="h-4 w-4 text-primary" />
                      Color Theme
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Choose between light and dark visual aesthetics for high-focus reading
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (theme !== "light") toggleTheme();
                      }}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3.5 rounded-xl border text-center transition-all cursor-pointer relative",
                        theme === "light"
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border hover:bg-muted/40"
                      )}
                    >
                      <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
                        <Sun className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">Light Mode</div>
                        <div className="text-[10px] text-muted-foreground">Crisp & high daylight contrast</div>
                      </div>
                      {theme === "light" && (
                        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (theme !== "dark") toggleTheme();
                      }}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3.5 rounded-xl border text-center transition-all cursor-pointer relative",
                        theme === "dark"
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border hover:bg-muted/40"
                      )}
                    >
                      <div className="h-10 w-10 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                        <Moon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">Dark Mode</div>
                        <div className="text-[10px] text-muted-foreground">Easy on the eyes for late review</div>
                      </div>
                      {theme === "dark" && (
                        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="h-px bg-border" />

                {/* Exam & Study Behavior Configurations */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-primary" />
                      Study Experience Preferences
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Customize quiz interface behaviors and study accessibility
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {/* Auto-Advance Setting */}
                    <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                      <div>
                        <div className="text-xs font-bold text-foreground">Auto-advance questions</div>
                        <div className="text-[11px] text-muted-foreground">Automatically proceed to the next item when selecting an answer</div>
                      </div>
                      <Button
                        type="button"
                        variant={autoAdvanceQuiz ? "default" : "outline"}
                        size="sm"
                        onClick={handleToggleAutoAdvance}
                        className="h-7 text-xs font-semibold px-3 rounded-full cursor-pointer"
                      >
                        {autoAdvanceQuiz ? "Enabled" : "Disabled"}
                      </Button>
                    </div>

                    {/* Audio & Feedback Setting */}
                    <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                      <div>
                        <div className="text-xs font-bold text-foreground">Audio & Sound effects</div>
                        <div className="text-[11px] text-muted-foreground">Play subtle chime sounds during mock exam checkpoints</div>
                      </div>
                      <Button
                        type="button"
                        variant={soundEffects ? "default" : "outline"}
                        size="sm"
                        onClick={handleToggleSounds}
                        className="h-7 text-xs font-semibold px-3 rounded-full cursor-pointer"
                      >
                        {soundEffects ? "Enabled" : "Disabled"}
                      </Button>
                    </div>

                    {/* High Contrast Setting */}
                    <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                      <div>
                        <div className="text-xs font-bold text-foreground">Enhanced contrast borders</div>
                        <div className="text-[11px] text-muted-foreground">Increase clarity and outline weight of quiz choices</div>
                      </div>
                      <Button
                        type="button"
                        variant={highContrast ? "default" : "outline"}
                        size="sm"
                        onClick={handleToggleContrast}
                        className="h-7 text-xs font-semibold px-3 rounded-full cursor-pointer"
                      >
                        {highContrast ? "On" : "Off"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: AI SETTINGS */}
            {activeTab === "ai" && (
              <div className="space-y-5 animate-in fade-in-50">
                {/* AI Quota & Limits Overview */}
                <div className={cn(
                  "p-4 rounded-xl border shadow-xs space-y-3",
                  hasCustomKey
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : isExhausted
                    ? "bg-rose-500/10 border-rose-500/30"
                    : isLow
                    ? "bg-amber-500/10 border-amber-500/30"
                    : "bg-muted/40 border-border"
                )}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {hasCustomKey ? "Active Custom Engine" : "Daily Free AI Quota"}
                      </div>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-foreground">
                          {hasCustomKey ? "Unlimited Access" : `${remaining} Left`}
                        </span>
                        {!hasCustomKey && (
                          <span className="text-xs font-semibold text-muted-foreground">
                            / {total} queries daily
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[11px] font-bold px-2 py-0.5",
                        hasCustomKey
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
                          : isExhausted
                          ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40"
                          : isLow
                          ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40"
                          : "bg-primary/15 text-primary border-primary/30"
                      )}
                    >
                      {hasCustomKey ? `${providerName.split(" ")[0]} Engine` : `${remaining} Queries`}
                    </Badge>
                  </div>

                  {!hasCustomKey ? (
                    <div className="space-y-1.5">
                      <Progress value={Math.max(2, 100 - percentage)} className="h-2 bg-muted/60" />
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                        <span>{used} used today</span>
                        <span>Resets in {resetTimeStr} (midnight)</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>Direct connection configured for {providerName}. No daily query throttle.</span>
                    </div>
                  )}
                </div>

                {/* Auto Failover Switch */}
                <div className="p-3.5 rounded-xl border border-border bg-card space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-foreground">Automatic AI Failover</h4>
                        <p className="text-[11px] text-muted-foreground">Automatically switches to a backup engine if one fails or rate-limits</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={autoSwitch ? "default" : "outline"}
                      onClick={handleToggleAutoSwitch}
                      className="h-7 text-xs font-semibold px-3 rounded-full cursor-pointer"
                    >
                      {autoSwitch ? "Enabled" : "Disabled"}
                    </Button>
                  </div>
                </div>

                {/* API Key Tutorial Callout */}
                <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Need help getting an API key?</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Follow our quick 60-second tutorial on how to get a 100% free Google Gemini or Groq key.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setTutorialOpen(true)}
                    className="h-8 text-xs font-semibold px-3 rounded-lg border-primary/30 text-primary hover:bg-primary/10 shrink-0 cursor-pointer"
                  >
                    View Tutorial
                  </Button>
                </div>

                {/* Select AI Provider */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground block">
                    Choose AI Engine / Provider:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PROVIDER_LIST.map((provId) => {
                      const prov = AI_PROVIDERS[provId];
                      const isSelected = selectedProvider === provId;
                      const isConfigured = Boolean(getStoredApiKeyForProvider(provId));
                      const isCurrentlyActive = providerId === provId;

                      return (
                        <button
                          key={provId}
                          type="button"
                          onClick={() => handleSelectProvider(provId)}
                          className={cn(
                            "p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer",
                            isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                              : "border-border hover:border-primary/50 hover:bg-muted/30"
                          )}
                        >
                          <div className="flex items-start justify-between gap-1 w-full mb-1">
                            <span className="text-xs font-bold text-foreground truncate">{prov.name}</span>
                            {isCurrentlyActive && (
                              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="Active Engine" />
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[9px] px-1 py-0 h-4 border",
                                prov.freeTier
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {prov.badge}
                            </Badge>
                            {isConfigured && (
                              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-primary/10 text-primary">
                                Key Saved
                              </Badge>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Provider Help & Key Input */}
                <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">{currentMeta.name}</span>
                      <span className="text-[11px] text-muted-foreground">• Model: {currentMeta.defaultModel}</span>
                    </div>
                    <a
                      href={currentMeta.getKeyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-semibold"
                    >
                      {currentMeta.getKeyLabel}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {currentMeta.description}
                  </p>
                </div>

                {/* Key Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">
                      Paste {currentMeta.name} API Key:
                    </label>
                    {hasKeyForSelected && (
                      <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Stored locally
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <Input
                      type={showKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => {
                        setApiKey(e.target.value);
                        setTestResult(null);
                      }}
                      placeholder={currentMeta.placeholder}
                      className="pr-20 text-xs font-mono"
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                        onClick={() => setShowKey(!showKey)}
                      >
                        {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Actions: Test, Clear, Save */}
                <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestKey}
                    disabled={testingKey || !apiKey.trim()}
                    className="text-xs gap-1.5 h-8 cursor-pointer"
                  >
                    {testingKey ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        Test Connection
                      </>
                    )}
                  </Button>

                  <div className="flex items-center gap-2">
                    {hasKeyForSelected && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleClearKey}
                        className="text-xs text-destructive hover:bg-destructive/10 h-8 gap-1 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Clear Key
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={handleSaveKey}
                      className="text-xs h-8 gap-1.5 cursor-pointer"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Save & Activate
                    </Button>
                  </div>
                </div>

                {testResult && (
                  <div
                    className={cn(
                      "flex items-start gap-2 p-2.5 rounded-lg text-xs animate-in fade-in border",
                      testResult.success
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        : "bg-destructive/10 text-destructive border-destructive/30"
                    )}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 font-medium">{testResult.message}</div>
                  </div>
                )}

                {savedSuccess && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20 animate-in fade-in">
                    <Check className="h-4 w-4" />
                    <span>AI Engine updated to {currentMeta.name} successfully!</span>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: FEEDBACK & REPORT BUGS */}
            {activeTab === "feedback" && (
              <div className="space-y-4 animate-in fade-in-50">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    User Feedback & Issue Reporting
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Help us improve KolehiyoTrack! We actively read every submission to refine questions, features, and mock exams.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-foreground">Official Feedback Form</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Submit question error reports, feature suggestions, or general impressions through our quick Google Form.
                      </p>
                    </div>
                  </div>

                  <Button
                    asChild
                    variant="default"
                    className="w-full h-9 rounded-xl font-semibold text-xs gap-2"
                  >
                    <a
                      href="https://docs.google.com/forms/d/e/1FAIpQLSeoetYxHNgRQxyJX0k4H5UpI0B3NXE6YHbNgk6fhOP3jH23wg/viewform?usp=header"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open Google Feedback Form
                    </a>
                  </Button>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-card space-y-2 text-xs text-muted-foreground">
                  <h5 className="font-bold text-foreground text-xs">What you can report:</h5>
                  <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
                    <li>Discrepancies in question explanations or formula solutions</li>
                    <li>Requests for newly covered college entrance tests (PUPCET, PLMAT, etc.)</li>
                    <li>UI improvements or mobile viewing issues</li>
                    <li>AI tutoring quality observations</li>
                  </ul>
                </div>
              </div>
            )}

            {/* TAB 4: ABOUT & SYSTEM */}
            {activeTab === "about" && (
              <div className="space-y-4 animate-in fade-in-50">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-primary" />
                    About KolehiyoTrack (Sulyap)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    An open-access, full-spectrum College Entrance Test preparation platform
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <span className="text-muted-foreground">Platform</span>
                    <span className="font-bold text-foreground">KolehiyoTrack Reviewer</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <span className="text-muted-foreground">Exam Coverage</span>
                    <span className="font-bold text-foreground">UPCAT, ACET, DCAT, BUCET</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <span className="text-muted-foreground">AI Tutor Service</span>
                    <span className="font-bold text-foreground">Multi-Engine (Gemini, Groq, OpenAI)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Offline Capable</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Yes (PWA ready)</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-border bg-card text-[11px] text-muted-foreground leading-relaxed">
                  Designed for Filipino students striving for their dream university admissions. Review with confidence, track mistake logs, and prepare without barriers.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-card flex items-center justify-between">
          <div className="text-[11px] text-muted-foreground hidden sm:block">
            Settings are automatically applied and saved locally.
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="text-xs font-semibold ml-auto"
          >
            Done
          </Button>
        </div>
      </DialogContent>
      <APIKeyTutorialModal
        open={tutorialOpen}
        onOpenChange={setTutorialOpen}
        defaultProvider={selectedProvider}
      />
    </Dialog>
  );
}
