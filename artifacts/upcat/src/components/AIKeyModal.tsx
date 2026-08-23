import { useState, useEffect } from "react";
import { 
  Key, 
  Check, 
  Trash2, 
  Sparkles, 
  ExternalLink, 
  ShieldCheck, 
  AlertCircle,
  Eye,
  EyeOff
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getStoredGeminiApiKey, saveStoredGeminiApiKey } from "@/lib/geminiKey";

interface AIKeyModalProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onKeySaved?: (hasKey: boolean) => void;
}

export function AIKeyModal({ trigger, open, onOpenChange, onKeySaved }: AIKeyModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const isControlled = typeof open === "boolean";
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = (val: boolean) => {
    if (isControlled && onOpenChange) {
      onOpenChange(val);
    } else {
      setInternalOpen(val);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const current = getStoredGeminiApiKey();
      setApiKey(current);
      setSavedSuccess(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    const trimmed = apiKey.trim();
    saveStoredGeminiApiKey(trimmed);
    setSavedSuccess(true);
    onKeySaved?.(Boolean(trimmed));
    setTimeout(() => {
      setSavedSuccess(false);
      setIsOpen(false);
    }, 900);
  };

  const handleClear = () => {
    saveStoredGeminiApiKey("");
    setApiKey("");
    setSavedSuccess(true);
    onKeySaved?.(false);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 900);
  };

  const hasConfiguredKey = Boolean(getStoredGeminiApiKey());

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 border-border/80 hover:bg-primary/10 hover:text-primary transition-all shadow-2xs cursor-pointer"
            title="Custom Gemini API Key settings"
          >
            <Key className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {hasConfiguredKey ? "API Key Configured" : "Enter API Key"}
            </span>
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="h-9 w-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
              <Key className="h-4.5 w-4.5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                Gemini API Key Configuration
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Connect your Google AI Studio key for unlimited Isko AI tutoring & question generation.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Google AI Studio API Key</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-primary hover:underline flex items-center gap-1 font-normal inline-flex"
              >
                Get Free API Key <ExternalLink className="h-3 w-3" />
              </a>
            </label>
            <div className="relative flex items-center">
              <Input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="pr-20 text-xs font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 text-xs text-muted-foreground hover:text-foreground px-1.5 py-1 rounded cursor-pointer"
                title={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2 text-xs text-muted-foreground">
            <div className="flex items-start gap-2 text-foreground font-medium">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Direct Browser-to-Cloud Integration</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              When saved here in your browser, all AI features (Isko AI Chat, Exam Question Scanning, and Error Explanations) will immediately and directly use your key.
            </p>
          </div>

          {savedSuccess && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs animate-in fade-in">
              <Check className="h-4 w-4" />
              <span>API key saved successfully!</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-row items-center justify-between sm:justify-between gap-2 pt-2">
          {apiKey.trim() ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5 cursor-pointer"
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
              className="text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              className="text-xs font-semibold gap-1.5 cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" />
              Save Key
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
