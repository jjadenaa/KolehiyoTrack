import React, { useState, useEffect } from "react";
import { 
  Key, 
  Sparkles, 
  ExternalLink, 
  Check, 
  Trash2, 
  ShieldCheck, 
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  XCircle,
  Zap,
  Layers,
  BookOpen,
  Cloud,
  HardDrive,
  LogIn
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { saveUserAISettingsToAccount } from "@/lib/userAISettings";
import { APIKeyTutorialModal } from "@/components/APIKeyTutorialModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  AIProvider, 
  AI_PROVIDERS, 
  getActiveAIProvider, 
  setActiveAIProvider, 
  getStoredApiKeyForProvider, 
  saveStoredApiKeyForProvider,
  hasAnyCustomApiKey,
  getActiveApiKeyInfo,
  getStoredGroqModel
} from "@/lib/geminiKey";
import { testAIProviderConnection } from "@/lib/geminiClientService";

interface AIKeyModalProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onKeySaved?: (hasKey: boolean) => void;
  initialProvider?: AIProvider;
  highlightLimitReached?: boolean;
}

const PROVIDER_LIST: AIProvider[] = ["gemini", "groq", "openai", "openrouter", "deepseek"];

export function AIKeyModal({ 
  trigger, 
  open, 
  onOpenChange, 
  onKeySaved,
  initialProvider,
  highlightLimitReached = false
}: AIKeyModalProps) {
  const { user, signInWithGoogle } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(initialProvider || getActiveAIProvider());
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const isControlled = typeof open === "boolean";
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = (next: boolean) => {
    if (isControlled) {
      onOpenChange?.(next);
    } else {
      setInternalOpen(next);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const active = initialProvider || getActiveAIProvider();
      setSelectedProvider(active);
      setApiKey(getStoredApiKeyForProvider(active));
      setSavedSuccess(false);
      setTestResult(null);
    }
  }, [isOpen, initialProvider]);

  // When selected provider changes in the tab, load that provider's saved key
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
        // Auto-save and activate provider on successful test
        saveStoredApiKeyForProvider(selectedProvider, cleanKey);
        setActiveAIProvider(selectedProvider);
        if (user) {
          await saveUserAISettingsToAccount(user, {
            activeProvider: selectedProvider,
            providerKey: { provider: selectedProvider, key: cleanKey },
          });
        }
        onKeySaved?.(true);
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

  const handleSave = async () => {
    const trimmed = cleanKeyInput(apiKey);
    saveStoredApiKeyForProvider(selectedProvider, trimmed);
    if (trimmed) {
      setActiveAIProvider(selectedProvider);
    }
    if (user) {
      await saveUserAISettingsToAccount(user, {
        activeProvider: trimmed ? selectedProvider : undefined,
        providerKey: { provider: selectedProvider, key: trimmed },
      });
    }
    setSavedSuccess(true);
    onKeySaved?.(Boolean(trimmed));
    setTimeout(() => {
      setSavedSuccess(false);
      setIsOpen(false);
    }, 700);
  };

  const handleClear = async () => {
    saveStoredApiKeyForProvider(selectedProvider, "");
    setApiKey("");
    if (user) {
      await saveUserAISettingsToAccount(user, {
        providerKey: { provider: selectedProvider, key: "" },
      });
    }
    setSavedSuccess(true);
    setTestResult(null);
    onKeySaved?.(hasAnyCustomApiKey());
    setTimeout(() => {
      setSavedSuccess(false);
    }, 1000);
  };

  const activeInfo = getActiveApiKeyInfo();
  const currentMeta = AI_PROVIDERS[selectedProvider];
  const hasKeyForSelected = Boolean(getStoredApiKeyForProvider(selectedProvider));
  const activeModelDisplay = selectedProvider === "groq" 
    ? getStoredGroqModel() 
    : currentMeta.defaultModel;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : isControlled ? null : (
        <DialogTrigger asChild>
          <Button
            variant={activeInfo.hasKey ? "secondary" : "outline"}
            size="sm"
            className={`gap-1.5 text-xs font-semibold h-8 rounded-lg cursor-pointer transition-all ${
              activeInfo.hasKey
                ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                : "border-primary/30 hover:border-primary text-primary"
            }`}
          >
            <Key className="h-3.5 w-3.5" />
            {activeInfo.hasKey ? (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{activeInfo.meta.name} Active</span>
              </span>
            ) : (
              "Configure AI Key"
            )}
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Configure AI Choices & API Key
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground pt-0.5">
                Choose your preferred AI provider to unlock unlimited questions, instant mistake tutoring, and chatbot queries.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Account Sync Status Banner */}
        {user ? (
          <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-3 py-2 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-medium">
                Syncing with account <span className="font-bold underline">{user.email}</span>
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
              Account Sync Active
            </Badge>
          </div>
        ) : (
          <div className="bg-muted/40 border border-border/80 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <HardDrive className="h-4 w-4 text-primary shrink-0" />
              <span className="text-[11px] leading-tight">
                Currently saving locally. Sign in with Google to sync keys across your devices.
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={signInWithGoogle}
              className="h-7 text-xs px-2.5 gap-1 shrink-0 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer font-medium"
            >
              <LogIn className="h-3 w-3" />
              Sign In
            </Button>
          </div>
        )}

        {highlightLimitReached && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2.5 text-amber-900 dark:text-amber-200 text-xs">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Daily Free AI Limit Reached</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Select any AI provider below (e.g. Google Gemini or Groq) and paste your free key to continue studying with unlimited AI queries immediately.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4 py-1">
          {/* Provider Selection Cards */}
          <div>
            <label className="text-xs font-semibold text-foreground block mb-2">
              Select AI Engine / Provider:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PROVIDER_LIST.map((provId) => {
                const prov = AI_PROVIDERS[provId];
                const isSelected = selectedProvider === provId;
                const isConfigured = Boolean(getStoredApiKeyForProvider(provId));
                const isCurrentlyActive = activeInfo.hasKey && activeInfo.provider === provId;

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
          <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">{currentMeta.name}</span>
                <span className="text-[11px] text-muted-foreground">• Model: {activeModelDisplay}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setTutorialOpen(true)}
                  className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-medium cursor-pointer"
                >
                  <BookOpen className="h-3 w-3" />
                  Key Tutorial
                </button>
                <a
                  href={currentMeta.getKeyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-medium"
                >
                  {currentMeta.getKeyLabel}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
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
                  {user ? (
                    <>
                      <Cloud className="h-3 w-3 text-emerald-500" /> Saved to account
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3 w-3" /> Saved on this device
                    </>
                  )}
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
                  Testing Connection...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Test Connection
                </>
              )}
            </Button>
            <span className="text-[11px] text-muted-foreground">
              Direct verification with {currentMeta.name}
            </span>
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

          {/* Privacy Note */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 text-foreground font-medium">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Security & Account Persistence</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              {user 
                ? "Your API keys and engine preferences are securely synced with your Google account. You can study from any phone, laptop, or browser without re-entering keys." 
                : "Your API keys are stored in your device storage. Sign in with Google above to save and sync them across all your study devices."}
            </p>
          </div>

          {savedSuccess && (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20 animate-in fade-in">
              <Check className="h-4 w-4" />
              <span>
                {user 
                  ? `Saved & synced to account (${user.email}) for ${currentMeta.name}!` 
                  : `AI Engine updated to ${currentMeta.name} successfully!`}
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row items-center justify-between sm:justify-between gap-2 border-t pt-3">
          {hasKeyForSelected ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-xs text-destructive hover:bg-destructive/10 cursor-pointer gap-1.5 h-8"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove Key
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-xs h-8 cursor-pointer"
            >
              Close
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              className="text-xs h-8 cursor-pointer gap-1.5"
            >
              <Check className="h-3.5 w-3.5" />
              {user ? "Save to Account" : "Save & Activate"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
      <APIKeyTutorialModal
        open={tutorialOpen}
        onOpenChange={setTutorialOpen}
        defaultProvider={selectedProvider}
      />
    </Dialog>
  );
}
