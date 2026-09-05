import React, { useState, useEffect } from "react";
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
  hasAnyCustomApiKey,
  getActiveApiKeyInfo,
  AutoSwitchEventDetail 
} from "@/lib/geminiKey";
import { testAIProviderConnection } from "@/lib/geminiClientService";
import { 
  Zap, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  Key, 
  ExternalLink,
  Check,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  XCircle,
  AlertCircle,
  X,
  Sparkles
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface AILimitCounterProps {
  compact?: boolean;
  className?: string;
  showDetailsOnClick?: boolean;
}

const PROVIDER_LIST: AIProvider[] = ["gemini", "groq", "openai", "openrouter", "deepseek"];

export function AILimitCounter({ 
  compact = false, 
  className,
  showDetailsOnClick = true 
}: AILimitCounterProps) {
  const quota = useAIQuota();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"limits" | "engines">("limits");
  const [autoSwitch, setAutoSwitch] = useState(quota.autoSwitchEnabled);
  
  // Engine & API Key management state
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(getActiveAIProvider());
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    setAutoSwitch(quota.autoSwitchEnabled);
  }, [quota.autoSwitchEnabled]);

  useEffect(() => {
    if (isOpen) {
      const active = getActiveAIProvider();
      setSelectedProvider(active);
      setApiKey(getStoredApiKeyForProvider(active));
      setSavedSuccess(false);
      setTestResult(null);
    }
  }, [isOpen]);

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
      setTestResult({ success: false, message: `Please enter an API key for ${AI_PROVIDERS[selectedProvider].name} first.` });
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
    featureBreakdown,
    candidates = [],
  } = quota;

  const currentMeta = AI_PROVIDERS[selectedProvider];
  const hasKeyForSelected = Boolean(getStoredApiKeyForProvider(selectedProvider));

  // Single clean trigger button (no nested badges, no side boxes)
  const renderTrigger = () => {
    if (hasCustomKey) {
      return (
        <button
          type="button"
          onClick={() => showDetailsOnClick && setIsOpen(true)}
          className={cn(
            "group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-xs select-none",
            "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:border-emerald-500/50",
            className
          )}
          title={`Unlimited AI active (${providerName}). Click to manage AI limits and keys.`}
          aria-label="View AI status and settings"
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <Zap className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span className="font-bold tracking-tight">
            {providerName.split(" ")[0]} AI
          </span>
          <span className="text-[11px] font-normal text-muted-foreground">•</span>
          <span className="text-[11px] font-medium opacity-90">Unlimited</span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => showDetailsOnClick && setIsOpen(true)}
        className={cn(
          "group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-xs select-none",
          isExhausted
            ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:border-rose-500/50"
            : isLow
            ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:border-amber-500/50"
            : "bg-primary/10 hover:bg-primary/15 text-primary border-primary/25 hover:border-primary/40",
          className
        )}
        title={`${remaining} of ${total} free AI queries remaining today. Resets in ${resetTimeStr}. Click to manage AI limits and keys.`}
        aria-label="View AI usage limit counter"
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span className={cn(
            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
            isExhausted ? "bg-rose-400" : isLow ? "bg-amber-400" : "bg-primary/60"
          )} />
          <span className={cn(
            "relative inline-flex rounded-full h-2 w-2",
            isExhausted ? "bg-rose-500" : isLow ? "bg-amber-500" : "bg-primary"
          )} />
        </span>
        <Zap className={cn(
          "h-3.5 w-3.5 shrink-0 transition-transform group-hover:scale-110",
          isExhausted ? "text-rose-500" : isLow ? "text-amber-500" : "text-amber-500"
        )} />
        <span className="font-bold tracking-tight">
          {remaining}/{total} AI Left
        </span>
        <div className="w-8 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
          <div
            className={cn(
              "h-full transition-all duration-300 rounded-full",
              isExhausted ? "bg-rose-500" : isLow ? "bg-amber-500" : "bg-primary"
            )}
            style={{ width: `${Math.max(5, 100 - percentage)}%` }}
          />
        </div>
      </button>
    );
  };

  return (
    <>
      {renderTrigger()}

      {/* Unified AI Center Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md sm:max-w-lg p-0 overflow-hidden border border-border shadow-2xl max-h-[90vh] flex flex-col">
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
            <DialogHeader className="space-y-1 text-left">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                  <Zap className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground">
                    Isko AI Control Center
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Monitor usage limits, configure auto-failover, and manage AI providers
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="limits" className="text-xs font-semibold gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Usage & Limits
                </TabsTrigger>
                <TabsTrigger value="engines" className="text-xs font-semibold gap-1.5">
                  <Key className="h-3.5 w-3.5" />
                  API Keys & Engines
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: Usage & Limits */}
              <TabsContent value="limits" className="space-y-4 m-0">
                {/* Main Visual Limit Gauge Card */}
                <div className={cn(
                  "p-4 sm:p-5 rounded-2xl border text-card-foreground shadow-xs space-y-3.5 transition-all",
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
                        {hasCustomKey ? "Active Engine & Quota" : "Daily Free AI Limit"}
                      </div>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                          {hasCustomKey ? "Unlimited" : remaining}
                        </span>
                        {!hasCustomKey && (
                          <span className="text-sm font-semibold text-muted-foreground">
                            / {total} queries left today
                          </span>
                        )}
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs font-bold px-2.5 py-1",
                        hasCustomKey
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
                          : isExhausted
                          ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40"
                          : isLow
                          ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40"
                          : "bg-primary/15 text-primary border-primary/30"
                      )}
                    >
                      {hasCustomKey ? `${providerName.split(" ")[0]} Active` : isExhausted ? "Limit Reached" : `${total - used} Queries Left`}
                    </Badge>
                  </div>

                  {!hasCustomKey ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{used} queries used</span>
                        <span className="font-semibold text-foreground">{100 - percentage}% available</span>
                      </div>
                      <Progress 
                        value={Math.max(2, 100 - percentage)} 
                        className="h-2.5 bg-muted/60"
                      />
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-0.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>Resets automatically in <strong className="text-foreground">{resetTimeStr}</strong> (midnight).</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      <span>
                        Powered by your custom <strong>{providerName}</strong> API key. You have unrestricted, direct high-speed queries.
                      </span>
                    </div>
                  )}
                </div>

                {/* Smart Auto-Switch / Failover Controller */}
                <div className="p-3.5 sm:p-4 rounded-xl border border-border bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-foreground">
                          Automatic AI Failover
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          Switches AI if credits run out or rate limits hit
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant={autoSwitch ? "default" : "outline"}
                      onClick={handleToggleAutoSwitch}
                      className={cn(
                        "h-7 text-xs font-semibold px-3 rounded-full",
                        autoSwitch 
                          ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                          : "text-muted-foreground"
                      )}
                    >
                      {autoSwitch ? "Enabled" : "Disabled"}
                    </Button>
                  </div>

                  <div className="text-[11px] text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border/50 leading-relaxed">
                    {autoSwitch ? (
                      <span>
                        ⚡ <strong>Auto-Switch is ON:</strong> If your active engine hits a rate limit or runs out of credits, Sulyap will seamlessly switch to your next configured backup engine without interrupting your review.
                      </span>
                    ) : (
                      <span>
                        ⚠️ <strong>Auto-Switch is OFF:</strong> Queries will only attempt your currently active provider.
                      </span>
                    )}
                  </div>

                  {/* Provider Priority Quick Switch */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Available Engines
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab("engines")}
                        className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Manage Keys <ExternalLink className="h-2.5 w-2.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {candidates.map((c) => {
                        const isCurrent = c.provider === providerId;
                        return (
                          <div
                            key={c.provider}
                            className={cn(
                              "flex items-center justify-between p-2 rounded-lg border text-xs transition-all",
                              isCurrent
                                ? "bg-primary/10 border-primary/40 font-bold text-foreground"
                                : "bg-muted/20 border-border/70 text-muted-foreground hover:border-primary/30"
                            )}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <span className={cn(
                                "h-2 w-2 rounded-full shrink-0",
                                isCurrent 
                                  ? "bg-emerald-500 animate-pulse" 
                                  : c.isConfigured 
                                  ? "bg-blue-500" 
                                  : "bg-muted-foreground/40"
                              )} />
                              <span className="truncate">{c.meta.name.split(" ")[0]}</span>
                              {isCurrent && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-primary/20 text-primary border-primary/30">
                                  Active
                                </Badge>
                              )}
                            </div>

                            {!isCurrent && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleQuickSwitch(c.provider)}
                                className="h-6 text-[11px] px-2 text-primary hover:text-primary hover:bg-primary/10"
                              >
                                Switch
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Feature Usage Breakdown */}
                {Object.keys(featureBreakdown).length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Today's Activity Breakdown
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2 rounded-lg border border-border bg-muted/20 text-center">
                        <span className="text-[11px] text-muted-foreground block">Isko Chat</span>
                        <span className="font-bold text-foreground">{featureBreakdown["chat"] || 0}</span>
                      </div>
                      <div className="p-2 rounded-lg border border-border bg-muted/20 text-center">
                        <span className="text-[11px] text-muted-foreground block">Mistakes</span>
                        <span className="font-bold text-foreground">{featureBreakdown["error_explain"] || 0}</span>
                      </div>
                      <div className="p-2 rounded-lg border border-border bg-muted/20 text-center">
                        <span className="text-[11px] text-muted-foreground block">PDF Scans</span>
                        <span className="font-bold text-foreground">{featureBreakdown["pdf_scan"] || 0}</span>
                      </div>
                      <div className="p-2 rounded-lg border border-border bg-muted/20 text-center">
                        <span className="text-[11px] text-muted-foreground block">Quiz Gen</span>
                        <span className="font-bold text-foreground">{featureBreakdown["question_gen"] || 0}</span>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* TAB 2: API Keys & Engines */}
              <TabsContent value="engines" className="space-y-4 m-0">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-2">
                    Select AI Provider:
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
                          className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                            isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                              : "border-border hover:border-primary/50 hover:bg-muted/30"
                          }`}
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
                              className={`text-[9px] px-1 py-0 h-4 border ${
                                prov.freeTier
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                  : "bg-muted text-muted-foreground"
                              }`}
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

                {/* Active Provider Details & Instructions */}
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
                        <CheckCircle2 className="h-3 w-3" /> Saved on browser
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

                {/* Test Connection Button & Indicator */}
                <div className="flex items-center justify-between gap-2">
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
                        className="text-xs text-destructive hover:bg-destructive/10 h-8 gap-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Clear
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={handleSaveKey}
                      className="text-xs h-8 gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Save & Activate
                    </Button>
                  </div>
                </div>

                {testResult && (
                  <div
                    className={`flex items-start gap-2 p-2.5 rounded-lg text-xs animate-in fade-in border ${
                      testResult.success
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        : "bg-destructive/10 text-destructive border-destructive/30"
                    }`}
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

                {/* Privacy Note */}
                <div className="rounded-xl border border-border bg-muted/20 p-2.5 space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5 text-foreground font-medium text-[11px]">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span>Secure Local Storage</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Keys are kept strictly on your local browser. Never stored or shared on external servers.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="p-3 sm:px-6 sm:py-3 border-t border-border flex items-center justify-end bg-card">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Global floating alert that displays whenever an automatic AI failover occurs
 */
export function AIAutoSwitchNotification() {
  const [notification, setNotification] = useState<AutoSwitchEventDetail | null>(null);

  useEffect(() => {
    const handleAutoSwitched = (e: any) => {
      if (e.detail) {
        setNotification(e.detail);
        // Auto-dismiss after 7 seconds
        const timer = setTimeout(() => {
          setNotification((curr) => (curr?.timestamp === e.detail.timestamp ? null : curr));
        }, 7000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener("sulyap_ai_auto_switched", handleAutoSwitched);
    return () => {
      window.removeEventListener("sulyap_ai_auto_switched", handleAutoSwitched);
    };
  }, []);

  if (!notification) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="p-3.5 rounded-xl border border-primary/30 bg-card text-card-foreground shadow-xl space-y-2 backdrop-blur-md">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Zap className="h-4 w-4 text-amber-500 animate-bounce" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-foreground">
                Automatic AI Failover Active
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Switched from {notification.fromProviderName} to <strong className="text-foreground">{notification.toProviderName}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md"
            aria-label="Dismiss notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed pl-8">
          The previous engine reached its limit or was busy. Your review continues seamlessly!
        </p>
      </div>
    </div>
  );
}
