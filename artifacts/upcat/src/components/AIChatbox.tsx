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
  Lightbulb,
  Maximize2,
  Minimize2,
  X,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { SmartText } from "./SmartText";
import { AILimitCounter } from "./AILimitCounter";
import { checkCanUseAI, recordAIUsage, useAIQuota } from "@/lib/aiQuota";
import { sendGeminiChatMessage } from "@/lib/geminiClientService";
import { getActiveAIProvider, setActiveAIProvider, AIProvider } from "@/lib/geminiKey";

interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: Date;
  isError?: boolean;
  retryPrompt?: string;
}

export interface SuggestedTopic {
  label: string;
  category: "math" | "science" | "verbal" | "strategy";
  prompt: string;
}

export const ALL_SUGGESTED_TOPICS: SuggestedTopic[] = [
  // ─── Math High-Yield & Fast Shortcuts ───
  {
    label: "📐 Quadratic & Vieta Shortcuts",
    category: "math",
    prompt: "Show me the fastest shortcuts for the Quadratic Formula, Discriminant ($b^2 - 4ac$), and Vieta's formulas ($x_1+x_2$ and $x_1 x_2$) for CET exams. Use KaTeX and keep it under 150 words.",
  },
  {
    label: "⚡ Fast Discount & Percent Tricks",
    category: "math",
    prompt: "Give me the fastest mental math shortcuts for successive percentage discounts, percent increase/decrease, and mixture ratios on entrance tests. Keep it concise with a 30-second example.",
  },
  {
    label: "⭕ Circle Angles & Arc Theorems",
    category: "math",
    prompt: "Summarize the essential Circle Theorems tested in UPCAT and DCAT (inscribed angles, central angles, tangent-secant power theorem) in KaTeX formulas and 1-line rules.",
  },
  {
    label: "🔢 Logarithm & Exponent Rules",
    category: "math",
    prompt: "What are the must-know Logarithm properties and exponent manipulation rules for college entrance tests? Give formulas in KaTeX with instant calculation examples.",
  },
  {
    label: "⏱️ Work-Rate & Relative Speed",
    category: "math",
    prompt: "What is the universal shortcut formula for work-rate ($1/A + 1/B = 1/T$) and relative speed problems (moving towards vs away)? Give a quick 30-second solving trick.",
  },
  {
    label: "📐 Special Triangles & Trig Ratios",
    category: "math",
    prompt: "Provide the side ratios for 30-60-90, 45-45-90 special right triangles, and standard SOH-CAH-TOA angle values for 0°, 30°, 45°, 60°, 90° in KaTeX.",
  },
  {
    label: "🎲 Permutations vs Combinations",
    category: "math",
    prompt: "How do I immediately distinguish Permutations ($nPr$) from Combinations ($nCr$) in CET word problems? Give the formulas in KaTeX and a 30-second elimination rule.",
  },
  {
    label: "📈 Linear Equations & Slope Traps",
    category: "math",
    prompt: "Explain parallel vs perpendicular slopes ($m_1 \\cdot m_2 = -1$), finding intercepts quickly, and distance/midpoint formulas in KaTeX for CET geometry.",
  },

  // ─── Science Core & Traps ───
  {
    label: "🧬 Genetics: Punnett & Pedigree Traps",
    category: "science",
    prompt: "Explain monohybrid vs dihybrid phenotypic ratios (9:3:3:1), sex-linked inheritance (colorblindness/hemophilia), and codominance rules for UPCAT Science in concise bullet points.",
  },
  {
    label: "🔬 Mitosis vs. Meiosis Stages",
    category: "science",
    prompt: "What are the high-yield differences between Mitosis and Meiosis (chromosome counts, crossing over in Prophase I, haploid vs diploid) frequently tested on CETs?",
  },
  {
    label: "🚗 Kinematics: 4 Big Motion Formulas",
    category: "science",
    prompt: "List the 4 fundamental Kinematics motion equations with constant acceleration in clean KaTeX ($v = v_0 + at$, etc.) and specify which formula to use when time $t$ or distance $d$ is missing.",
  },
  {
    label: "🧪 Stoichiometry & Mole Calculations",
    category: "science",
    prompt: "Show the fastest 3-step method to solve mole-to-gram conversions and limiting reactant stoichiometry problems without complicated long calculations.",
  },
  {
    label: "🌿 Photosynthesis vs. Respiration",
    category: "science",
    prompt: "Summarize the light-dependent reactions vs Calvin cycle, and glycolysis vs Krebs cycle ATP outputs in a concise high-yield comparison for entrance exams.",
  },
  {
    label: "🔍 Optics: Lenses vs. Mirrors Rules",
    category: "science",
    prompt: "What is the foolproof sign convention rule for concave vs convex mirrors and converging vs diverging lenses (real vs virtual, inverted vs upright)? Keep it punchy.",
  },
  {
    label: "🌍 Plate Boundaries & Seismic Waves",
    category: "science",
    prompt: "Explain the key differences between P-waves and S-waves (speed, mediums traversed) and convergent, divergent, and transform plate boundaries for Earth Science.",
  },
  {
    label: "⚡ Newton's Laws & Friction Traps",
    category: "science",
    prompt: "Explain Newton's 3 Laws of Motion, static vs kinetic friction ($f_s \\le \\mu_s N$), and normal force on inclined planes in KaTeX notation for CET physics.",
  },

  // ─── Verbal Proficiency & Reading Speed ───
  {
    label: "🇵🇭 Wastong Gamit: Nang vs. Ng",
    category: "verbal",
    prompt: "What are the definitive rules for 'Nang' vs. 'Ng', 'May' vs. 'Mayroon', 'Din' vs. 'Rin', and 'Pahiran' vs. 'Pahirin' in Filipino grammar? Give short, clear rules and examples.",
  },
  {
    label: "✍️ Subject-Verb Agreement Traps",
    category: "verbal",
    prompt: "Break down the top 5 trickiest Subject-Verb Agreement traps in English CETs (inverted sentences, collective nouns, intervening phrases, and 'either...or').",
  },
  {
    label: "📖 Speed Reading: Skim & Scan",
    category: "verbal",
    prompt: "What is the optimal technique to read long 500-word CET reading comprehension passages in under 60 seconds and locate inference questions without re-reading?",
  },
  {
    label: "🔤 Context Clues & Prefix/Root Secrets",
    category: "verbal",
    prompt: "How can students decipher difficult college-level vocabulary using Latin/Greek roots, prefixes (mal-, bene-, ante-), and context clues when taking exams?",
  },
  {
    label: "🎯 Author's Tone & Logical Fallacies",
    category: "verbal",
    prompt: "How do you quickly recognize an author's tone, purpose, and common logical fallacies (ad hominem, false dilemma, straw man) in CET verbal sections?",
  },

  // ─── Test Day Strategies & University Admissions ───
  {
    label: "⚖️ UPCAT Right-Minus-Wrong Rule",
    category: "strategy",
    prompt: "How does the UPCAT right-minus-wrong penalty ($+1$ vs $-0.25$) work mathematically, and when is it statistically optimal to eliminate choices and guess vs leaving blank?",
  },
  {
    label: "⏱️ ACET 30-Second Rapid-Fire Pacing",
    category: "strategy",
    prompt: "What is the optimal time-management strategy for the Ateneo College Entrance Test (ACET) where sections have 50 questions in 35-40 minutes?",
  },
  {
    label: "🏛️ Exam Format: UPCAT vs ACET vs DCAT",
    category: "strategy",
    prompt: "Compare the exam style, calculator rules, subtests, and scoring emphasis across UPCAT, ACET, DCAT, and USTET in 4 concise bullets.",
  },
  {
    label: "🏆 Quota Programs & UPG Predictor",
    category: "strategy",
    prompt: "How do University Predicted Grade (UPG) campus cut-offs work in UP (Diliman, Manila, UPLB), and what are the strategic considerations for selecting 1st and 2nd campus choices?",
  },
  {
    label: "🎒 Exam Day Checklist & Mental Calm",
    category: "strategy",
    prompt: "Provide a quick, practical checklist for the night before and morning of the CET: required test permits, snacks, pacing mindset, and handling test anxiety.",
  },

  // ─── Additional Math Shortcuts ───
  {
    label: "🧮 Remainder Theorem & Synthetic Division",
    category: "math",
    prompt: "How does the Polynomial Remainder and Factor Theorem work on CET exams? Show a 20-second shortcut without doing long polynomial division.",
  },
  {
    label: "📏 Coordinate Geometry & Circle Equations",
    category: "math",
    prompt: "Explain the standard form of circle $(x-h)^2 + (y-k)^2 = r^2$, completing the square shortcut, and line-circle intersection traps in KaTeX.",
  },
  {
    label: "📈 Arithmetic vs Geometric Sequences",
    category: "math",
    prompt: "Give the formulas for $n$-th term and sum of arithmetic and geometric series (including infinite geometric series sum $S = \\frac{a_1}{1-r}$) with quick calculation tricks in KaTeX.",
  },
  {
    label: "📊 Probability Traps: Independent vs Dependent",
    category: "math",
    prompt: "Clarify conditional probability, independent events vs mutually exclusive events, and card/marble replacement traps for CETs in 3 clear rules.",
  },
  {
    label: "📐 Right Triangle 3-4-5 & 5-12-13 Multiples",
    category: "math",
    prompt: "List the top 5 Pythagorean triples (3-4-5, 5-12-13, 7-24-25, 8-15-17) and how recognizing their multiples saves 2 minutes per geometry question on CETs.",
  },

  // ─── Additional Science Topics ───
  {
    label: "⚡ Ohm's Law & Circuit Traps",
    category: "science",
    prompt: "Explain Series vs Parallel circuits (voltage drop, total resistance $R_{\\text{eq}}$, current flow) and Ohm's Law ($V = IR$) with a 30-second memory rule.",
  },
  {
    label: "🧪 Acid-Base, pH & Neutralization",
    category: "science",
    prompt: "Explain $\\text{pH} = -\\log[H^+]$, strong vs weak acids/bases, and neutralization titration calculations for CET chemistry in concise points.",
  },
  {
    label: "🧬 Central Dogma: DNA to RNA to Protein",
    category: "science",
    prompt: "Break down replication, transcription, and translation (codons, anticodons, mRNA, tRNA) in 4 concise, high-yield bullet points for entrance tests.",
  },
  {
    label: "🌊 Waves & Doppler Effect Formula",
    category: "science",
    prompt: "Explain wave velocity ($v = f\\lambda$), transverse vs longitudinal waves, and frequency shifts in the Doppler effect in concise KaTeX rules.",
  },
  {
    label: "🪐 Gas Laws: Ideal, Boyle & Charles",
    category: "science",
    prompt: "List the core Gas Laws ($PV = nRT$, Boyle's, Charles's, Gay-Lussac's) and how to solve proportional pressure/volume changes without long scratch work.",
  },

  // ─── Additional Verbal & Filipino Topics ───
  {
    label: "🇵🇭 Tayutay (Figures of Speech in Filipino)",
    category: "verbal",
    prompt: "Explain Simili, Metapora, Personipikasyon, Pagmamalabis (Hyperbole), and Balintunay (Irony) with clear Filipino exam examples.",
  },
  {
    label: "✍️ Parallelism & Modifier Placement",
    category: "verbal",
    prompt: "How do you quickly spot Dangling Modifiers, Misplaced Modifiers, and Faulty Parallelism in English sentence correction questions?",
  },
  {
    label: "🇵🇭 Bahagi ng Pananalita (Pandiwa & Pokus)",
    category: "verbal",
    prompt: "Summarize the 7 Pokus ng Pandiwa (Tagaganap, Layon, Ganapan, Sanhi, Gamit, Direksyon, Kalaanan) with simple sentence patterns tested in CETs.",
  },
  {
    label: "📝 Transition Words & Rhetorical Purpose",
    category: "verbal",
    prompt: "List the essential transition categories (contrast, causality, concession, elaboration) and how they unlock sentence completion and paragraph organization questions.",
  },

  // ─── Additional Strategy & Target Universities ───
  {
    label: "🎯 Elimination & Educated Guessing",
    category: "strategy",
    prompt: "What are the top 4 multiple-choice elimination techniques for CETs (extreme words trap, duplicate answers, outlier choices, plug-in numbers)?",
  },
  {
    label: "🏛️ PLMAT & BulSU CET Exam Strategy",
    category: "strategy",
    prompt: "What are the specific scoring formats, subject balance, and time pressure strategies for city and state university entrance tests like PLMAT and BUCET/BulSU?",
  },
  {
    label: "🧠 Mental Stamina for 4-Hour Exams",
    category: "strategy",
    prompt: "How do you prevent brain fatigue and attention lapses during a grueling 4-hour, 200+ question college entrance exam?",
  },
];

export function sampleRevolvedTopics(pool: SuggestedTopic[], count = 8): SuggestedTopic[] {
  const categories: Array<SuggestedTopic["category"]> = ["math", "science", "verbal", "strategy"];
  const selected: SuggestedTopic[] = [];

  // Guarantee at least 1-2 from each core category
  categories.forEach((cat) => {
    const fromCat = pool.filter((t) => t.category === cat);
    if (fromCat.length > 0) {
      const randomItem = fromCat[Math.floor(Math.random() * fromCat.length)];
      selected.push(randomItem);
    }
  });

  // Fill remaining slots from the rest of the pool
  const remaining = pool.filter((t) => !selected.some((s) => s.label === t.label));
  const shuffledRemaining = [...remaining].sort(() => 0.5 - Math.random());

  while (selected.length < count && shuffledRemaining.length > 0) {
    selected.push(shuffledRemaining.pop()!);
  }

  // Shuffle final selection
  return selected.sort(() => 0.5 - Math.random());
}

export function AIChatbox() {
  const quota = useAIQuota();
  const [activeEngine, setActiveEngine] = useState<AIProvider>(() => getActiveAIProvider());

  useEffect(() => {
    const handleKeyChanged = () => {
      setActiveEngine(getActiveAIProvider());
    };
    window.addEventListener("sulyap_ai_key_changed", handleKeyChanged);
    return () => {
      window.removeEventListener("sulyap_ai_key_changed", handleKeyChanged);
    };
  }, []);

  const handleEngineChange = (provider: AIProvider) => {
    setActiveAIProvider(provider);
    setActiveEngine(provider);
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "model",
      text: "Kumusta, Iskolar! 👋 I'm **Isko AI**, your CET Study & Admissions Assistant.\n\nAsk me anything about **Math, Science, Language Proficiency, Reading Comprehension**, or **University Application Strategies**! Math formulas and step-by-step solutions are rendered with full KaTeX notation.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Revolving suggested topics pool for dynamic, fresh suggestions
  const [revolvedTopics, setRevolvedTopics] = useState<SuggestedTopic[]>(() =>
    sampleRevolvedTopics(ALL_SUGGESTED_TOPICS, 8)
  );
  const [isRevolving, setIsRevolving] = useState(false);

  const handleRevolveTopics = () => {
    setIsRevolving(true);
    setRevolvedTopics(sampleRevolvedTopics(ALL_SUGGESTED_TOPICS, 8));
    setTimeout(() => setIsRevolving(false), 350);
  };

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fullScreenMessagesRef = useRef<HTMLDivElement>(null);
  const promptsRef = useRef<HTMLDivElement>(null);
  const fullScreenPromptsRef = useRef<HTMLDivElement>(null);

  const scrollPrompts = (ref: React.RefObject<HTMLDivElement | null>, direction: "left" | "right") => {
    if (ref.current) {
      const amount = direction === "left" ? -220 : 220;
      ref.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  // Enable horizontal wheel scroll for quick prompts
  useEffect(() => {
    const el = isFullScreen ? fullScreenPromptsRef.current : promptsRef.current;
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
  }, [isExpanded, isFullScreen]);

  // Lock body scroll in fullscreen mode
  useEffect(() => {
    if (isFullScreen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isFullScreen]);

  // Handle ESC key to exit full screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullScreen]);

  const scrollToBottom = () => {
    if (isFullScreen && fullScreenMessagesRef.current) {
      fullScreenMessagesRef.current.scrollTop = fullScreenMessagesRef.current.scrollHeight;
    } else if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, isExpanded, isFullScreen]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    // Automatically transition to Full Screen mode when talking to Isko AI
    if (!isFullScreen) {
      setIsFullScreen(true);
    }

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

    // Revolve suggestions for the next question
    setRevolvedTopics(sampleRevolvedTopics(ALL_SUGGESTED_TOPICS, 8));

    try {
      // Format history for chat call
      const history = messages
        .filter((m) => m.id !== "welcome" && !m.text.startsWith("⏳ **AI Limit Reached") && !m.isError)
        .map((m) => ({
          role: m.role,
          text: m.text,
        }));

      const reply = await sendGeminiChatMessage(query, history);

      // Record successful AI quota consumption
      recordAIUsage("chat");

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: reply || "Sorry, I couldn't generate an answer.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: `⚠️ **Notice:** ${err.message || "Failed to communicate with AI server. Please try again in a few moments."}`,
        timestamp: new Date(),
        isError: true,
        retryPrompt: query,
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

  // Shared message list component
  const renderMessageList = () => (
    <>
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex gap-3 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
            msg.role === "user" ? "justify-end" : "justify-start"
          }`}
        >
          {msg.role === "model" && (
            <div className="h-8 w-8 rounded-xl bg-primary/15 text-primary border border-primary/20 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
              <Bot className="h-4 w-4" />
            </div>
          )}

          <div
            className={`group relative max-w-[90%] sm:max-w-[85%] rounded-2xl px-4 py-3 shadow-2xs transition-all duration-200 ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground font-medium rounded-tr-xs"
                : "bg-card border border-border text-card-foreground rounded-tl-xs"
            }`}
          >
            {msg.role === "model" ? (
              <div>
                <SmartText text={msg.text} className="text-sm sm:text-[14.5px] leading-relaxed font-sans" />
                {msg.isError && msg.retryPrompt && (
                  <div className="mt-2 pt-2 border-t border-border/40 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSend(msg.retryPrompt)}
                      disabled={isLoading}
                      className="h-7 text-xs gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border-primary/30 cursor-pointer"
                    >
                      <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
                      Retry Question
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-sm sm:text-[14.5px] leading-relaxed">{msg.text}</p>
            )}

            {msg.role === "model" && (
              <button
                onClick={() => handleCopy(msg.id, msg.text)}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute -bottom-3 right-2 bg-background border border-border text-muted-foreground hover:text-foreground text-[10px] p-1 rounded-md shadow-2xs flex items-center gap-1 cursor-pointer z-10"
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
          <div className="h-8 w-8 rounded-xl bg-primary/15 text-primary border border-primary/20 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
            <Bot className="h-4 w-4 animate-spin" />
          </div>
          <div className="bg-card border border-border text-muted-foreground rounded-2xl rounded-tl-xs px-4 py-3 text-xs sm:text-sm flex items-center gap-2.5 shadow-2xs">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
            <span>Isko AI is analyzing and generating response with KaTeX math & study notes...</span>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* 1. Dashboard Space-Saving Compact Card */}
      <Card className="w-full border-border bg-card shadow-sm overflow-hidden transition-all duration-300">
        <CardHeader 
          className="py-3 px-4 sm:px-5 bg-gradient-to-r from-primary/10 via-primary/5 to-muted/20 flex flex-row items-center justify-between gap-2 select-none border-b border-border/60"
        >
          <div 
            onClick={() => setIsExpanded((prev) => !prev)}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer flex-1 min-w-0"
            role="button"
            tabIndex={0}
          >
            <div className="h-9 w-9 rounded-xl bg-primary/15 dark:bg-primary/25 border border-primary/30 flex items-center justify-center text-primary shadow-xs shrink-0">
              <Sparkles className="h-4.5 w-4.5 animate-pulse text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <CardTitle className="text-xs sm:text-base font-extrabold tracking-tight truncate">
                  <span className="hidden xs:inline">Isko AI Study Assistant</span>
                  <span className="inline xs:hidden">Isko AI</span>
                </CardTitle>
              </div>
              <CardDescription className="text-[10px] sm:text-xs font-medium truncate text-muted-foreground mt-0.5 hidden xxs:block">
                24/7 tutor for UPCAT, ACET, DCAT, USTET & CET preparation
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <AILimitCounter compact className="inline-flex" />

            {/* Prominent Full Screen Button to prevent taking space and scrolling */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullScreen(true)}
              title="Open full screen AI study suite"
              className="h-8 px-2 sm:px-3 text-xs font-semibold gap-1 bg-background hover:bg-primary/10 hover:text-primary hover:border-primary/40 text-foreground border-border/80 shadow-2xs cursor-pointer"
            >
              <Maximize2 className="h-3.5 w-3.5 text-primary" />
              <span className="hidden sm:inline">Full Screen</span>
            </Button>

            {messages.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClear}
                title="Clear chat history"
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded((prev) => !prev)}
              title={isExpanded ? "Collapse inline chat" : "Expand inline chat"}
              className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>

        {/* Compact Quick Ask Bar (Always visible for quick questions without eating space) */}
        {!isExpanded && (
          <div className="p-3 sm:p-4 bg-card/60 space-y-2.5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Isko AI about Math formulas, Science, Grammar, or CET tips..."
                disabled={isLoading}
                className="flex-1 bg-background border border-input rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 transition-all placeholder:text-muted-foreground/70 shadow-2xs"
              />
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="rounded-xl px-3 sm:px-4 h-auto text-xs sm:text-sm font-semibold gap-1.5 shadow-xs transition-transform duration-200 hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Ask AI</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFullScreen(true)}
                title="Open Fullscreen Studio"
                className="rounded-xl px-2.5 h-auto text-xs font-medium text-muted-foreground hover:text-primary cursor-pointer"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </form>

            {/* Quick suggested chips */}
            <div className="flex items-center gap-2 overflow-hidden py-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 flex items-center gap-1">
                <Lightbulb className="h-3 w-3 text-amber-500" /> Topics:
              </span>
              <button
                type="button"
                onClick={handleRevolveTopics}
                className="flex items-center gap-1 text-[10.5px] font-semibold text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/15 px-2 py-0.5 rounded-full transition-all cursor-pointer shrink-0 shadow-2xs z-10"
                title="Shuffle and revolve topics"
              >
                <RefreshCw className={cn("h-2.5 w-2.5", isRevolving && "animate-spin")} />
                <span>Shuffle</span>
              </button>

              <div className="overflow-hidden whitespace-nowrap flex-1 relative mask-fade-edges">
                <div className="animate-marquee-slow inline-flex items-center gap-2">
                  {revolvedTopics.concat(revolvedTopics).map((qp, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(qp.prompt)}
                      disabled={isLoading}
                      className="whitespace-nowrap text-[11.5px] px-2.5 py-1 rounded-full border border-border/80 bg-muted/40 hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-all font-medium disabled:opacity-50 shrink-0 cursor-pointer shadow-2xs"
                    >
                      {qp.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setIsFullScreen(true)}
                className="whitespace-nowrap text-[11px] px-2 py-1 rounded-full font-semibold text-primary hover:underline shrink-0 cursor-pointer z-10"
              >
                + More
              </button>
            </div>
          </div>
        )}

        {/* Expandable Inline Chat Body */}
        {isExpanded && (
          <CardContent className="p-4 sm:p-5 space-y-3.5">
            <div 
              ref={messagesContainerRef}
              className="min-h-[160px] max-h-[360px] overflow-y-auto space-y-3.5 pr-1 text-sm border border-border/40 rounded-xl p-3.5 bg-muted/10 scroll-smooth [scrollbar-width:thin]"
            >
              {renderMessageList()}
            </div>

            {/* Quick Prompts */}
            <div className="space-y-1.5 pt-0.5 relative group/prompts">
              <div className="flex items-center justify-between px-0.5">
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-500 animate-pulse" /> Suggested Topics
                  </p>
                  <button
                    type="button"
                    onClick={handleRevolveTopics}
                    className="flex items-center gap-1 text-[10.5px] font-semibold text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/15 px-2 py-0.5 rounded-full transition-all cursor-pointer shadow-2xs"
                    title="Shuffle and revolve topics"
                  >
                    <RefreshCw className={cn("h-2.5 w-2.5", isRevolving && "animate-spin")} />
                    <span>Shuffle</span>
                  </button>
                </div>
                <div className="flex items-center gap-1 opacity-70 group-hover/prompts:opacity-100 transition-opacity duration-200">
                  <button
                    type="button"
                    onClick={() => scrollPrompts(promptsRef, "left")}
                    className="h-5 w-5 rounded-full bg-muted/80 hover:bg-primary/20 hover:text-primary active:scale-95 flex items-center justify-center text-muted-foreground transition-all duration-150 cursor-pointer"
                    title="Scroll left"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollPrompts(promptsRef, "right")}
                    className="h-5 w-5 rounded-full bg-muted/80 hover:bg-primary/20 hover:text-primary active:scale-95 flex items-center justify-center text-muted-foreground transition-all duration-150 cursor-pointer"
                    title="Scroll right"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div 
                ref={promptsRef}
                className="overflow-hidden whitespace-nowrap py-1 relative mask-fade-edges"
              >
                <div 
                  className="animate-marquee-slow inline-flex items-center gap-2"
                  onAnimationIteration={handleRevolveTopics}
                >
                  {revolvedTopics.concat(revolvedTopics).map((qp, idx) => (
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

            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1 pt-1">
              <div className="flex items-center gap-1.5 truncate">
                <Zap className="h-3 w-3 text-amber-500 shrink-0" />
                <span className="truncate">
                  {quota.hasCustomKey 
                    ? `${quota.providerName} Unlimited Active` 
                    : `${quota.remaining} of ${quota.total} AI queries left today (resets in ${quota.resetTimeStr})`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsFullScreen(true)}
                className="text-primary hover:underline font-medium flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Maximize2 className="h-3 w-3" /> Full Screen View
              </button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 2. Floating AI Button (Allows chatting from anywhere on page without scrolling to top) */}
      <button
        onClick={() => setIsFullScreen(true)}
        className="fixed bottom-5 right-5 z-40 bg-primary text-primary-foreground shadow-xl hover:shadow-2xl rounded-full px-4 py-2.5 font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer border border-primary-foreground/20 group"
        title="Chat with Isko AI in full screen"
      >
        <Sparkles className="h-4 w-4 text-amber-300 animate-pulse group-hover:rotate-12 transition-transform" />
        <span>Ask Isko AI</span>
      </button>

      {/* 3. Dedicated Full Screen AI Study Suite Modal */}
      {isFullScreen && (
        <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-5xl h-[95vh] sm:h-[90vh] bg-card border border-border/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="py-3 px-4 sm:px-6 bg-muted/40 border-b border-border flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-xs">
                  <Sparkles className="h-5 w-5 animate-pulse text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground">
                      Isko AI Study Suite
                    </h2>
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                      Fullscreen Mode
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    Full KaTeX math formula derivations, tables, and comprehensive CET study notes
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <AILimitCounter compact className="inline-flex" />

                {messages.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    title="Clear conversation"
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    <span className="hidden sm:inline">Clear</span>
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFullScreen(false)}
                  title="Exit fullscreen (Esc)"
                  className="h-8 px-3 text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                  <span>Exit Full Screen</span>
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFullScreen(false)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Modal Messages Container (Spacious reading space) */}
            <div
              ref={fullScreenMessagesRef}
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-muted/10 scroll-smooth [scrollbar-width:thin]"
            >
              {renderMessageList()}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-3 sm:p-5 bg-card border-t border-border space-y-3 shrink-0">
              {/* Quick Prompts */}
              <div className="flex items-center gap-2 relative group/fullprompts">
                <div className="flex items-center gap-1 shrink-0 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                  <span className="hidden sm:inline">Suggested:</span>
                </div>

                <button
                  type="button"
                  onClick={handleRevolveTopics}
                  className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/15 px-2.5 py-1 rounded-full transition-all cursor-pointer shrink-0 shadow-2xs"
                  title="Shuffle and revolve topics"
                >
                  <RefreshCw className={cn("h-2.5 w-2.5", isRevolving && "animate-spin")} />
                  <span>Shuffle</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => scrollPrompts(fullScreenPromptsRef, "left")}
                  className="h-5 w-5 rounded-full bg-muted/80 hover:bg-primary/20 hover:text-primary active:scale-95 flex items-center justify-center text-muted-foreground transition-all shrink-0 cursor-pointer"
                  title="Scroll left"
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>

                <div
                  ref={fullScreenPromptsRef}
                  className="overflow-hidden whitespace-nowrap py-0.5 relative mask-fade-edges flex-1"
                >
                  <div 
                    className="animate-marquee-slow inline-flex items-center gap-2"
                    onAnimationIteration={handleRevolveTopics}
                  >
                    {revolvedTopics.concat(revolvedTopics).map((qp, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(qp.prompt)}
                        disabled={isLoading}
                        className="whitespace-nowrap text-xs px-3 py-1.5 rounded-full border border-border/80 bg-muted/50 hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-all font-medium disabled:opacity-50 shrink-0 cursor-pointer shadow-2xs"
                      >
                        {qp.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => scrollPrompts(fullScreenPromptsRef, "right")}
                  className="h-5 w-5 rounded-full bg-muted/80 hover:bg-primary/20 hover:text-primary active:scale-95 flex items-center justify-center text-muted-foreground transition-all shrink-0 cursor-pointer"
                  title="Scroll right"
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
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
                  placeholder="Type your question or formula inquiry (e.g., 'Derive quadratic formula with KaTeX')..."
                  disabled={isLoading}
                  autoFocus
                  className="flex-1 bg-background border border-input rounded-xl px-4 py-2.5 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 transition-all placeholder:text-muted-foreground/70 shadow-2xs"
                />
                <Button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="rounded-xl px-5 h-auto font-semibold gap-2 shadow-xs transition-transform duration-200 hover:scale-105 active:scale-95 cursor-pointer text-sm sm:text-base"
                >
                  <Send className="h-4 w-4" />
                  <span>Send</span>
                </Button>
              </form>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3 w-3 text-amber-500 shrink-0" />
                  <span>
                    {quota.hasCustomKey 
                      ? `${quota.providerName} Unlimited Active` 
                      : `${quota.remaining} of ${quota.total} queries left today`}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground/70 hidden sm:inline">
                  Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/60 font-mono text-[10px]">Esc</kbd> to exit full screen
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
