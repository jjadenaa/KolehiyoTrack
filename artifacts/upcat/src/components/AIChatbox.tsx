import { useState, useRef, useEffect } from "react";
import { 
  Bot, 
  Send, 
  Sparkles, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft,
  ChevronRight,
  Copy, 
  Check, 
  RefreshCw,
  Zap,
  BookOpen,
  HelpCircle,
  Lightbulb,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { SmartText } from "./SmartText";
import { AICreditsBadge } from "./AICreditsBadge";
import { checkCanUseAI, recordAIUsage, useAIQuota } from "@/lib/aiQuota";

interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  { label: "📐 Important Math Formulas", prompt: "What are the most important Math formulas and shortcut rules to memorize for college entrance tests like UPCAT, ACET, and DCAT?" },
  { label: "🏛️ Coverage of Universities", prompt: "Can you summarize the exam coverage and subtest subjects for major Philippine universities (UPCAT, ACET, DCAT, USTET, BUCET)?" },
  { label: "📚 Study Tips", prompt: "What are the most effective study tips, memory techniques, and time management strategies for reviewing for CETs?" },
  { label: "📋 Application Requirements", prompt: "What are the typical application requirements, Form 137/138 submission processes, and documents needed for college applications?" },
  { label: "🎓 College Tips", prompt: "Can you give advice and practical tips for incoming college freshmen on choosing degree programs, campus life, and surviving first year?" },
  { label: "🧪 Science Core Concepts", prompt: "What high-yield Physics, Chemistry, Biology, and Earth Science topics are tested in college entrance exams?" },
  { label: "📝 Language & Reading Tips", prompt: "Give me essential grammar rules and reading comprehension strategies for CET verbal sections." },
];

export function AIChatbox() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "model",
      text: "Kumusta, Iskolar! 👋 I'm **Isko AI**, your Gemini-powered CET Study & Admissions Assistant.\n\nAsk me anything about **Math, Science, Language Proficiency, Reading Comprehension**, or **University Application Strategies**!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const promptsRef = useRef<HTMLDivElement>(null);

  const scrollPrompts = (direction: "left" | "right") => {
    if (promptsRef.current) {
      const amount = direction === "left" ? -220 : 220;
      promptsRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const el = promptsRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      } else if (e.deltaX !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaX;
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, [isExpanded]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (isExpanded) {
      scrollToBottom();
    }
  }, [messages, isLoading, isExpanded]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    // Check daily quota and anti-spam limits
    const quotaCheck = checkCanUseAI();
    if (!quotaCheck.allowed) {
      const limitMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: `⏳ **AI Limit Reached:** ${quotaCheck.reason || "Please wait a moment before sending another query."}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, limitMsg]);
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      text: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setIsLoading(true);

    try {
      // Format history for server call
      const history = messages
        .filter((m) => m.id !== "welcome" && !m.text.startsWith("⏳ **AI Limit Reached"))
        .map((m) => ({
          role: m.role,
          text: m.text,
        }));

      const apiPath = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/gemini/chat`;
      const res = await fetch(apiPath, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: query,
          history,
        }),
      });

      let data: any = {};
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        if (text.startsWith("<!DOCTYPE") || text.includes("<html")) {
          throw new Error("API endpoint route returned HTML instead of JSON. Ensure the server is running properly.");
        }
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`Server returned unexpected response (${res.status}).`);
        }
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to get AI response.");
      }

      // Record successful AI quota consumption
      recordAIUsage("chat");

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: data.reply || "Sorry, I couldn't generate an answer.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: `⚠️ **Notice:** ${err.message || "Failed to communicate with AI server. Please try again in a few moments."}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClear = () => {
    setMessages([
      {
        id: "welcome-" + Date.now(),
        role: "model",
        text: "Chat cleared! How can I help you with your CET review today?",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <Card className="w-full border-border bg-card shadow-md overflow-hidden transition-all duration-300">
      {/* Header */}
      <CardHeader 
        onClick={() => setIsExpanded((prev) => !prev)}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsExpanded((prev) => !prev);
          }
        }}
        className={`py-3 px-4 sm:px-6 bg-gradient-to-r from-primary/10 via-primary/5 to-muted/20 flex flex-row items-center justify-between gap-2 cursor-pointer select-none hover:bg-primary/15 transition-all duration-200 ${
          isExpanded ? "border-b border-border/80" : ""
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/15 dark:bg-primary/25 border border-primary/30 flex items-center justify-center text-primary shadow-xs">
            <Sparkles className="h-5 w-5 animate-pulse text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-extrabold tracking-tight flex items-center gap-1.5">
                Isko AI Assistant
              </CardTitle>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 flex items-center gap-1">
                <Zap className="h-3 w-3" /> Gemini 3.6 Flash
              </span>
            </div>
            <CardDescription className="text-xs font-medium line-clamp-1">
              Your 24/7 AI tutor for UPCAT, ACET, DCAT, USTET & CET preparation
            </CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AICreditsBadge compact className="hidden sm:inline-flex" />
          {messages.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              title="Clear chat history"
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded((prev) => !prev);
            }}
            title={isExpanded ? "Collapse chat" : "Expand chat"}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {/* Expandable Chat Body with smooth grid transition */}
      <div 
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"
        }`}
      >
        <div className="overflow-hidden">
          <CardContent className="p-4 sm:p-5 space-y-3.5">
            {/* Messages Container */}
            <div 
              ref={messagesContainerRef}
              className="min-h-[160px] max-h-[360px] overflow-y-auto space-y-3.5 pr-1 text-sm border border-border/40 rounded-xl p-3.5 bg-muted/10 scroll-smooth [scrollbar-width:thin]"
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "model" && (
                    <div className="h-7 w-7 rounded-lg bg-primary/15 text-primary border border-primary/20 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={`group relative max-w-[85%] rounded-2xl px-4 py-3 shadow-2xs transition-all duration-200 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground font-medium rounded-tr-xs"
                        : "bg-card border border-border text-card-foreground rounded-tl-xs"
                    }`}
                  >
                    {msg.role === "model" ? (
                      <SmartText text={msg.text} className="text-sm leading-relaxed" />
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    )}

                    {msg.role === "model" && (
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute -bottom-3 right-2 bg-background border border-border text-muted-foreground hover:text-foreground text-[10px] p-1 rounded-md shadow-2xs flex items-center gap-1 cursor-pointer"
                        title="Copy response"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-500" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" /> Copy
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 justify-start animate-in fade-in duration-200">
                  <div className="h-7 w-7 rounded-lg bg-primary/15 text-primary border border-primary/20 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Bot className="h-4 w-4 animate-spin" />
                  </div>
                  <div className="bg-card border border-border text-muted-foreground rounded-2xl rounded-tl-xs px-4 py-3 text-xs flex items-center gap-2 shadow-2xs">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
                    <span>Isko AI is analyzing and generating response...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Prompts right above the input bar */}
            <div className="space-y-1.5 pt-0.5 relative group/prompts">
              <div className="flex items-center justify-between px-0.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-500 animate-pulse" /> Suggested Topics
                </p>
                <div className="flex items-center gap-1 opacity-70 group-hover/prompts:opacity-100 transition-opacity duration-200">
                  <button
                    type="button"
                    onClick={() => scrollPrompts("left")}
                    className="h-5 w-5 rounded-full bg-muted/80 hover:bg-primary/20 hover:text-primary active:scale-95 flex items-center justify-center text-muted-foreground transition-all duration-150 cursor-pointer"
                    title="Scroll left"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollPrompts("right")}
                    className="h-5 w-5 rounded-full bg-muted/80 hover:bg-primary/20 hover:text-primary active:scale-95 flex items-center justify-center text-muted-foreground transition-all duration-150 cursor-pointer"
                    title="Scroll right"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div 
                ref={promptsRef}
                className="flex items-center gap-1.5 overflow-x-auto py-1 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              >
                {QUICK_PROMPTS.map((qp, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(qp.prompt)}
                    disabled={isLoading}
                    className="whitespace-nowrap text-xs px-3 py-1.5 rounded-full border border-border/80 bg-muted/40 hover:bg-primary/10 hover:border-primary/40 hover:text-primary hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 font-medium disabled:opacity-50 shrink-0 cursor-pointer shadow-2xs"
                  >
                    {qp.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Isko AI about Math formulas, Science concepts, Grammar, or UPCAT tips..."
                disabled={isLoading}
                className="flex-1 bg-background border border-input rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 transition-all placeholder:text-muted-foreground/70 shadow-2xs"
              />
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="rounded-xl px-4 h-auto font-semibold gap-2 shadow-xs transition-transform duration-200 hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Ask</span>
              </Button>
            </form>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
