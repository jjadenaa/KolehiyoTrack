import React, { useState } from "react";
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
import {
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Key,
  Copy,
  Check,
  HelpCircle,
  ShieldCheck,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  XCircle,
  Zap,
  Info,
  ChevronRight,
  BookOpen
} from "lucide-react";
import { 
  AIProvider, 
  AI_PROVIDERS, 
  saveStoredApiKeyForProvider, 
  setActiveAIProvider,
  getStoredApiKeyForProvider,
  parseCloudflareCredentials,
  getStoredCloudflareAccountId,
  saveStoredCloudflareAccountId
} from "@/lib/geminiKey";
import { testAIProviderConnection } from "@/lib/geminiClientService";
import { cn } from "@/lib/utils";

interface APIKeyTutorialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProvider?: AIProvider;
}

export function APIKeyTutorialModal({
  open,
  onOpenChange,
  defaultProvider = "gemini",
}: APIKeyTutorialModalProps) {
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(defaultProvider);
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  
  // Quick test & save inside tutorial
  const [apiKey, setApiKey] = useState(() => {
    if (defaultProvider === "cloudflare") {
      const creds = parseCloudflareCredentials(getStoredApiKeyForProvider("cloudflare") || "");
      return creds.apiToken;
    }
    return getStoredApiKeyForProvider(defaultProvider) || "";
  });
  const [cfAccountId, setCfAccountId] = useState(() => getStoredCloudflareAccountId());
  const [showKey, setShowKey] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleProviderChange = (provider: AIProvider) => {
    setSelectedProvider(provider);
    if (provider === "cloudflare") {
      const stored = getStoredApiKeyForProvider("cloudflare") || "";
      const creds = parseCloudflareCredentials(stored);
      setCfAccountId(creds.accountId || getStoredCloudflareAccountId());
      setApiKey(creds.apiToken);
    } else {
      setApiKey(getStoredApiKeyForProvider(provider) || "");
    }
    setTestResult(null);
    setSavedSuccess(false);
  };

  const handleCopyLink = (url: string, stepNum: number) => {
    navigator.clipboard.writeText(url);
    setCopiedStep(stepNum);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const cleanKeyInput = (raw: string) => {
    return raw.trim().replace(/^["'`]|["'`]$/g, "").trim();
  };

  const handleTestKey = async () => {
    let cleanKey = cleanKeyInput(apiKey);
    if (!cleanKey) {
      setTestResult({
        success: false,
        message: `Please paste your ${AI_PROVIDERS[selectedProvider].name} API key or token below first.`,
      });
      return;
    }

    if (selectedProvider === "cloudflare") {
      const cleanAcc = cfAccountId.trim();
      if (!cleanAcc && !cleanKey.includes(":")) {
        setTestResult({
          success: false,
          message: "Please enter your Cloudflare Account ID and API Token.",
        });
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
        setSavedSuccess(true);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Connection failed: ${err?.message || "Please check your network connection."}`,
      });
    } finally {
      setTestingKey(false);
    }
  };

  const handleSaveOnly = () => {
    let cleanKey = cleanKeyInput(apiKey);
    if (!cleanKey) return;

    if (selectedProvider === "cloudflare") {
      const cleanAcc = cfAccountId.trim();
      if (!cleanKey.includes(":") && cleanAcc) {
        cleanKey = `${cleanAcc}:${cleanKey}`;
      }
      if (cleanAcc) {
        saveStoredCloudflareAccountId(cleanAcc);
      }
    }

    saveStoredApiKeyForProvider(selectedProvider, cleanKey);
    setActiveAIProvider(selectedProvider);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 2500);
  };

  const currentMeta = AI_PROVIDERS[selectedProvider];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border border-border shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-bold text-foreground">
                  How to Get & Enter Your Free AI Key
                </DialogTitle>
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                  100% Free
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Takes ~60 seconds. No credit card, payment, or billing details required.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Provider Selection Tabs */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span>Select the service you want to get a key from:</span>
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => handleProviderChange("gemini")}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition-all cursor-pointer relative",
                  selectedProvider === "gemini"
                    ? "border-primary bg-primary/10 ring-1 ring-primary font-bold text-foreground shadow-xs"
                    : "border-border hover:bg-muted/40 text-muted-foreground"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs">Google Gemini</span>
                  <Badge className="text-[9px] px-1 py-0 h-4 bg-primary text-primary-foreground">
                    Best
                  </Badge>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Free via Google</div>
              </button>

              <button
                type="button"
                onClick={() => handleProviderChange("groq")}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition-all cursor-pointer relative",
                  selectedProvider === "groq"
                    ? "border-primary bg-primary/10 ring-1 ring-primary font-bold text-foreground shadow-xs"
                    : "border-border hover:bg-muted/40 text-muted-foreground"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs">Groq Cloud</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-emerald-500/30 text-emerald-600">
                    Fast
                  </Badge>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Free & Ultra-speed</div>
              </button>

              <button
                type="button"
                onClick={() => handleProviderChange("cohere")}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition-all cursor-pointer relative",
                  selectedProvider === "cohere"
                    ? "border-primary bg-primary/10 ring-1 ring-primary font-bold text-foreground shadow-xs"
                    : "border-border hover:bg-muted/40 text-muted-foreground"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs block">Cohere</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-emerald-500/30 text-emerald-600">
                    Free
                  </Badge>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">1k free calls/mo</div>
              </button>

              <button
                type="button"
                onClick={() => handleProviderChange("cloudflare")}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition-all cursor-pointer relative",
                  selectedProvider === "cloudflare"
                    ? "border-primary bg-primary/10 ring-1 ring-primary font-bold text-foreground shadow-xs"
                    : "border-border hover:bg-muted/40 text-muted-foreground"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs block">Cloudflare</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-emerald-500/30 text-emerald-600">
                    Daily
                  </Badge>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">10k free daily neurons</div>
              </button>
            </div>
          </div>

          {/* STEP-BY-STEP INSTRUCTIONS */}
          {selectedProvider === "gemini" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-start gap-2.5 text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-foreground">Why Google Gemini is Recommended:</span>
                  <p className="mt-0.5 text-[11px] leading-relaxed">
                    Google AI Studio grants every student and developer a generous free tier (thousands of free requests per day). It connects directly to your Google account with zero credit card required.
                  </p>
                </div>
              </div>

              {/* Step 1 */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-card">
                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-xs">
                  1
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="font-bold text-foreground text-xs">
                      Open the Google AI Studio Key Page
                    </h4>
                    <Button
                      asChild
                      size="sm"
                      className="h-7 text-xs font-semibold gap-1.5 rounded-full cursor-pointer"
                    >
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open AI Studio
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Click the button above or visit <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[10px] text-foreground">aistudio.google.com/app/apikey</code> in a new tab.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-card">
                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </div>
                <div className="space-y-1 flex-1">
                  <h4 className="font-bold text-foreground text-xs">
                    Sign In with your Google Account
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Log in with any normal Google / Gmail account. If it is your first time visiting Google AI Studio, simply accept the terms of service checkbox.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-card">
                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-xs">
                  3
                </div>
                <div className="space-y-1.5 flex-1">
                  <h4 className="font-bold text-foreground text-xs">
                    Click the blue &quot;Create API key&quot; button
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Look for the button labeled <strong className="text-foreground">Create API key</strong>. If prompted to choose a project, click <em>Create key in new project</em>.
                  </p>
                  <div className="p-2 rounded-lg bg-muted/40 border border-border text-[11px] flex items-center gap-2 text-muted-foreground">
                    <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>Google will instantly generate your key within 3 seconds.</span>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-card">
                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-xs">
                  4
                </div>
                <div className="space-y-1 flex-1">
                  <h4 className="font-bold text-foreground text-xs">
                    Copy the generated key
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    A modal will appear displaying your key. It starts with <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[10px] text-foreground">AIzaSy...</code>. Click the copy icon to copy it to your clipboard.
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-card">
                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-xs">
                  5
                </div>
                <div className="space-y-1 flex-1">
                  <h4 className="font-bold text-foreground text-xs">
                    Paste below & Click &quot;Test &amp; Activate&quot;
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Paste the key directly into the input box below. You can test it right here to confirm it works, and save it immediately!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* GROQ INSTRUCTIONS */}
          {selectedProvider === "groq" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-2.5 text-xs text-muted-foreground">
                <Zap className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-foreground">Groq Cloud (Ultra-Fast Inference):</span>
                  <p className="mt-0.5 text-[11px] leading-relaxed">
                    Groq provides blazingly fast responses and has a generous free tier using open-source models like LLaMA 3.3.
                  </p>
                </div>
              </div>

              {/* Step 1 */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-card">
                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-xs">
                  1
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="font-bold text-foreground text-xs">
                      Open Groq Console API Keys
                    </h4>
                    <Button
                      asChild
                      size="sm"
                      className="h-7 text-xs font-semibold gap-1.5 rounded-full cursor-pointer"
                    >
                      <a
                        href="https://console.groq.com/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open Groq Console
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Navigate to <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[10px] text-foreground">console.groq.com/keys</code>.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-card">
                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </div>
                <div className="space-y-1 flex-1">
                  <h4 className="font-bold text-foreground text-xs">
                    Sign in with Google or GitHub
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Sign in free of charge with your Google or GitHub credentials.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-card">
                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-xs">
                  3
                </div>
                <div className="space-y-1 flex-1">
                  <h4 className="font-bold text-foreground text-xs">
                    Click &quot;Create API Key&quot;
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Name your key (e.g. &quot;KolehiyoTrack&quot;) and click Submit.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-card">
                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-xs">
                  4
                </div>
                <div className="space-y-1 flex-1">
                  <h4 className="font-bold text-foreground text-xs">
                    Copy the key starting with &quot;gsk_...&quot;
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Groq only reveals the key once when generated, so click copy immediately.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* COHERE INSTRUCTIONS */}
          {selectedProvider === "cohere" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 flex items-start gap-2.5 text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-foreground">Cohere Command R (Completely Free Tier):</span>
                  <p className="mt-0.5 text-[11px] leading-relaxed">
                    Cohere provides a permanent free Trial API tier with 1,000 free API calls every month. No credit card or billing details required.
                  </p>
                </div>
              </div>

              {/* Step 1 */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-card">
                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-xs">
                  1
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="font-bold text-foreground text-xs">
                      Open Cohere Dashboard API Keys
                    </h4>
                    <Button
                      asChild
                      size="sm"
                      className="h-7 text-xs font-semibold gap-1.5 rounded-full cursor-pointer"
                    >
                      <a
                        href="https://dashboard.cohere.com/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open Cohere
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Go to <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[10px] text-foreground">dashboard.cohere.com/api-keys</code>.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-card">
                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </div>
                <div className="space-y-1 flex-1">
                  <h4 className="font-bold text-foreground text-xs">
                    Sign in with Google, GitHub, or Email
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Create an account in 10 seconds. You will be placed on the free Trial key plan automatically.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-card">
                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-xs">
                  3
                </div>
                <div className="space-y-1 flex-1">
                  <h4 className="font-bold text-foreground text-xs">
                    Copy your &quot;Trial key&quot;
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Under the &quot;Trial keys&quot; section, click the copy icon next to your key.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-card">
                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-xs">
                  4
                </div>
                <div className="space-y-1 flex-1">
                  <h4 className="font-bold text-foreground text-xs">
                    Paste below &amp; click Test Connection
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Paste the key below to immediately activate Cohere Command R.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* CLOUDFLARE INSTRUCTIONS */}
          {selectedProvider === "cloudflare" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl border border-orange-500/20 bg-orange-500/5 flex items-start gap-2.5 text-xs text-muted-foreground">
                <Zap className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-foreground">Cloudflare Workers AI (10,000 Free Neurons Every Day):</span>
                  <p className="mt-0.5 text-[11px] leading-relaxed">
                    Cloudflare provides 10,000 free Neurons every day with no credit card required. You need your <strong>Account ID</strong> and an <strong>API Token</strong>.
                  </p>
                </div>
              </div>

              {/* Step 1 */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-card">
                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-xs">
                  1
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="font-bold text-foreground text-xs">
                      Find Your Cloudflare Account ID
                    </h4>
                    <Button
                      asChild
                      size="sm"
                      className="h-7 text-xs font-semibold gap-1.5 rounded-full cursor-pointer"
                    >
                      <a
                        href="https://dash.cloudflare.com"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open Dashboard
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Log in at <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[10px] text-foreground">dash.cloudflare.com</code>. On your account home page or right sidebar, copy your 32-character <strong>Account ID</strong>.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-card">
                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="font-bold text-foreground text-xs">
                      Create an API Token with Workers AI Template
                    </h4>
                    <Button
                      asChild
                      size="sm"
                      className="h-7 text-xs font-semibold gap-1.5 rounded-full cursor-pointer"
                    >
                      <a
                        href="https://dash.cloudflare.com/profile/api-tokens"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Create Token
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Go to <strong>My Profile &gt; API Tokens</strong> &gt; click <strong>Create Token</strong> &gt; use the <strong>&quot;Workers AI (Read)&quot;</strong> or <strong>&quot;Edit Cloudflare Workers&quot;</strong> template.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-card">
                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-xs">
                  3
                </div>
                <div className="space-y-1 flex-1">
                  <h4 className="font-bold text-foreground text-xs">
                    Copy and Paste Below
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Enter both your Account ID and API Token in the fields below and click Test Connection!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* LIVE TEST & QUICK PASTE SECTION */}
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-foreground text-xs flex items-center gap-1.5">
                <Key className="h-4 w-4 text-primary" />
                Paste &amp; Save Your {currentMeta.name} Credentials:
              </label>
              <a
                href={currentMeta.getKeyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-primary hover:underline flex items-center gap-1 font-semibold"
              >
                {currentMeta.getKeyLabel}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {selectedProvider === "cloudflare" && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-foreground">
                  Cloudflare Account ID:
                </label>
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
                    setSavedSuccess(false);
                  }}
                  placeholder="e.g. 7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c"
                  className="text-xs font-mono bg-background"
                />
              </div>
            )}

            <div className="space-y-1">
              {selectedProvider === "cloudflare" && (
                <label className="text-[11px] font-semibold text-foreground">
                  Cloudflare API Token:
                </label>
              )}
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setTestResult(null);
                    setSavedSuccess(false);
                  }}
                  placeholder={currentMeta.placeholder}
                  className="pr-20 text-xs font-mono bg-background"
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

            {/* Verification and Save buttons */}
            <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestKey}
                disabled={testingKey || !apiKey.trim()}
                className="text-xs gap-1.5 h-8 cursor-pointer bg-background"
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

              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleSaveOnly}
                disabled={!apiKey.trim()}
                className="text-xs h-8 gap-1.5 cursor-pointer font-semibold"
              >
                <Check className="h-3.5 w-3.5" />
                Save &amp; Activate
              </Button>
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
                <span>Your {currentMeta.name} key has been verified and saved! You now have unlimited AI queries.</span>
              </div>
            )}
          </div>

          {/* PRIVACY & SECURITY ACCORDION/BOX */}
          <div className="p-3.5 rounded-xl border border-border bg-card space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Privacy &amp; Security Assurance</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
              <li>Your API key is saved solely on your local device (browser LocalStorage).</li>
              <li>Requests go straight from your browser to Google AI / Groq APIs.</li>
              <li>We never store, log, or transmit your API keys to our servers.</li>
              <li>You can remove or replace your key at any time in Settings.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-card flex items-center justify-between shrink-0">
          <div className="text-[11px] text-muted-foreground">
            Need more assistance? Ask in the Feedback form.
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs font-semibold"
          >
            Close Tutorial
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
