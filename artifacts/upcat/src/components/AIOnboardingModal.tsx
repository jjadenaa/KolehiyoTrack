import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Key, 
  ExternalLink, 
  Check, 
  Eye, 
  EyeOff, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Bot, 
  BrainCircuit, 
  FileSearch, 
  Compass,
  ArrowRight,
  BookOpen
} from "lucide-react";
import { APIKeyTutorialModal } from "@/components/APIKeyTutorialModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  AIProvider, 
  AI_PROVIDERS, 
  getActiveAIProvider, 
  setActiveAIProvider, 
  saveStoredApiKeyForProvider, 
  getStoredApiKeyForProvider,
  parseCloudflareCredentials,
  getStoredCloudflareAccountId,
  saveStoredCloudflareAccountId,
  hasAnyCustomApiKey 
} from "@/lib/geminiKey";
import { testAIProviderConnection } from "@/lib/geminiClientService";

const ONBOARDING_STORAGE_KEY = "upcat_ai_onboarding_completed";

export function AIOnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>("gemini");
  const [apiKey, setApiKey] = useState("");
  const [cfAccountId, setCfAccountId] = useState(() => getStoredCloudflareAccountId());
  const [showKey, setShowKey] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    // Only check in browser
    if (typeof window === "undefined") return;

    try {
      const alreadyCompleted = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      const alreadyHasKey = hasAnyCustomApiKey();

      // If user is new (has not seen onboarding and has no key configured), show modal
      if (!alreadyCompleted && !alreadyHasKey) {
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 700);
        return () => clearTimeout(timer);
      }
    } catch {
      // ignore localStorage errors
    }
  }, []);

  const handleSkip = () => {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    } catch {}
    setIsOpen(false);
  };

  const handleTestKey = async () => {
    let cleanKey = apiKey.trim().replace(/^["'`]|["'`]$/g, "").trim();
    if (!cleanKey) {
      setTestResult({ success: false, message: `Please paste your ${AI_PROVIDERS[selectedProvider].name} key or token first.` });
      return;
    }

    if (selectedProvider === "cloudflare") {
      const cleanAcc = cfAccountId.trim();
      if (!cleanAcc && !cleanKey.includes(":")) {
        setTestResult({ success: false, message: "Please enter your Cloudflare Account ID and API Token." });
        return;
      }
      if (!cleanKey.includes(":") && cleanAcc) {
        cleanKey = `${cleanAcc}:${cleanKey}`;
      }
    }

    setTestingKey(true);
    setTestResult(null);

    try {
      const res = await testAIProviderConnection(selectedProvider, cleanKey);
      setTestResult(res);
      if (res.success) {
        if (selectedProvider === "cloudflare") {
          saveStoredCloudflareAccountId(cfAccountId.trim());
        }
        saveStoredApiKeyForProvider(selectedProvider, cleanKey);
        setActiveAIProvider(selectedProvider);
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || "Failed to verify key." });
    } finally {
      setTestingKey(false);
    }
  };

  const handleSaveAndContinue = () => {
    let cleanKey = apiKey.trim().replace(/^["'`]|["'`]$/g, "").trim();
    if (selectedProvider === "cloudflare" && cleanKey && !cleanKey.includes(":") && cfAccountId.trim()) {
      cleanKey = `${cfAccountId.trim()}:${cleanKey}`;
    }
    if (selectedProvider === "cloudflare" && cfAccountId.trim()) {
      saveStoredCloudflareAccountId(cfAccountId.trim());
    }
    if (cleanKey) {
      saveStoredApiKeyForProvider(selectedProvider, cleanKey);
      setActiveAIProvider(selectedProvider);
    }
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    } catch {}
    setIsOpen(false);
  };

  const currentMeta = AI_PROVIDERS[selectedProvider];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleSkip();
      else setIsOpen(open);
    }}>
      <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl font-bold tracking-tight">
                  Welcome to Sulyap CET Reviewer!
                </DialogTitle>
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                  New Student
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground pt-0.5">
                Power your college entrance exam preparation with your personal AI study assistant.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Explanation Box */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-2.5">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <BrainCircuit className="h-4 w-4 text-primary" />
              <span>What is this API key used for?</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              This key connects your reviewer directly to artificial intelligence engines to provide personalized, real-time academic guidance:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="flex items-start gap-2 p-2 rounded-lg bg-background/70 border border-border/60">
                <Bot className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground block">Isko AI 24/7 Chatbot</strong>
                  <span className="text-muted-foreground">Ask any CET question, strategy, or college admission query.</span>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 rounded-lg bg-background/70 border border-border/60">
                <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground block">Instant Mistake Tutor</strong>
                  <span className="text-muted-foreground">Step-by-step diagnostic breakdown with KaTeX formulas.</span>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 rounded-lg bg-background/70 border border-border/60">
                <FileSearch className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground block">PDF Exam Scanner</strong>
                  <span className="text-muted-foreground">Digitizes your uploaded reviewers into real interactive quizzes.</span>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 rounded-lg bg-background/70 border border-border/60">
                <Compass className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground block">Targeted AI Quizzes</strong>
                  <span className="text-muted-foreground">Generates custom question drills tailored for UP, Ateneo, and DLSU.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Is it free explanation & link */}
          <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Completely Free — No Credit Card Needed
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline font-semibold text-[11px]"
              >
                Get Free Gemini Key
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Google AI Studio provides a free API key for students and developers. You can get yours in under 60 seconds with your standard Google Account.
            </p>
          </div>

          {/* AI Provider selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-foreground">Choose AI Provider:</label>
              <span className="text-[11px] text-muted-foreground">100% Free Tiers (No credit card)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {(["gemini", "groq", "cohere", "cloudflare"] as AIProvider[]).map((p) => {
                const prov = AI_PROVIDERS[p];
                const isSelected = selectedProvider === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setSelectedProvider(p);
                      if (p === "cloudflare") {
                        const creds = parseCloudflareCredentials(getStoredApiKeyForProvider("cloudflare") || "");
                        setCfAccountId(creds.accountId || getStoredCloudflareAccountId());
                        setApiKey(creds.apiToken);
                      } else {
                        setApiKey(getStoredApiKeyForProvider(p) || "");
                      }
                      setTestResult(null);
                    }}
                    className={`px-2 py-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                        : "border-border hover:border-primary/40 text-muted-foreground"
                    }`}
                  >
                    <span className="block text-[11px] font-semibold truncate">{prov.name.split(" ")[0]}</span>
                    <span className="block text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">{prov.badge}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cloudflare Account ID field if Cloudflare is selected */}
          {selectedProvider === "cloudflare" && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-foreground text-xs">
                  Cloudflare Account ID:
                </label>
                <span className="text-[10px] text-muted-foreground">
                  Found in dash.cloudflare.com sidebar
                </span>
              </div>
              <Input
                type="text"
                value={cfAccountId}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.includes(":")) {
                    const parts = val.split(":");
                    setCfAccountId(parts[0].trim());
                    setApiKey(parts[1].trim());
                  } else {
                    setCfAccountId(val);
                  }
                  setTestResult(null);
                }}
                placeholder="e.g. 7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c"
                className="text-xs font-mono"
              />
            </div>
          )}

          {/* Key Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-foreground">
                {selectedProvider === "cloudflare" ? "Cloudflare API Token:" : `Paste ${currentMeta.name} API Key:`}
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setTutorialOpen(true)}
                  className="text-primary hover:underline text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                >
                  <BookOpen className="h-3 w-3" />
                  View Guide &amp; Tutorial
                </button>
                <a
                  href={currentMeta.getKeyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline text-[11px]"
                >
                  {currentMeta.getKeyLabel}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
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

          {/* Test key button */}
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
                  <Key className="h-3.5 w-3.5 text-primary" />
                  Test Connection
                </>
              )}
            </Button>
            <span className="text-[11px] text-muted-foreground">
              Optional: Verify before saving
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
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row items-center justify-between gap-2 border-t pt-3">
          {/* Prominent Skip Option */}
          <Button
            type="button"
            variant="ghost"
            onClick={handleSkip}
            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer w-full sm:w-auto"
          >
            Skip for Now & Add Later
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              size="sm"
              onClick={handleSaveAndContinue}
              className="text-xs gap-1.5 cursor-pointer w-full sm:w-auto"
            >
              {apiKey.trim() ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Save Key & Start Reviewing
                </>
              ) : (
                <>
                  Start Reviewing
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
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
