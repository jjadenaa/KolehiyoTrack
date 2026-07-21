import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { listSessions } from "@/lib/firestoreSessions";
import { syncBankWithFirestore, uploadBankToFirestore } from "@/lib/firestoreBank";
import { Session } from "@/types/session";
import { useTest } from "@/context/TestContext";
import { SUBJECT_LABELS, formatTime, calcTotalSeconds, SECONDS_PER_ITEM } from "@/lib/format";
import { Layout } from "@/components/layout";
import { DailyMissionsTracker } from "@/components/DailyMissionsTracker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight, History, PlayCircle, BookOpen, ChevronDown, ChevronUp,
  CheckCircle, XCircle, Clock, RotateCcw, Upload, Trash2, RefreshCw,
  AlertTriangle, Copy, FileText, Sparkles, Wand2, Calculator, Cloud, CloudOff,
  ChevronLeft, ChevronRight, Gauge
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getBankStats, getBankQuestions, addBankQuestions, clearBank,
  resetUsedIds, pickQuestions, BankQuestion
} from "@/lib/questionBank";
import { useUpcatCountdown } from "@/hooks/useCountdown";

// ─── Editable Number Input ────────────────────────────────────────────────────

function NumberInput({
  value,
  onChange,
  min,
  max,
  disabled,
  className,
  id,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  disabled?: boolean;
  className?: string;
  id?: string;
}) {
  const [raw, setRaw] = useState(String(value));

  useEffect(() => {
    setRaw(String(value));
  }, [value]);

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      className={className}
      disabled={disabled}
      value={raw}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "" || /^\d+$/.test(v)) {
          setRaw(v);
        }
      }}
      onFocus={(e) => e.target.select()}
      onBlur={() => {
        const n = parseInt(raw) || min;
        const clamped = Math.max(min, Math.min(max, n));
        setRaw(String(clamped));
        onChange(clamped);
      }}
    />
  );
}

// ─── UPCAT Countdown ──────────────────────────────────────────────────────────

function UpcatCountdown() {
  const daysLeft = useUpcatCountdown();

  return (
    <div className="flex items-center gap-3 bg-gradient-to-r from-primary/10 to-amber-500/10 border border-primary/20 rounded-lg px-4 py-3 w-fit">
      <div className="flex items-center gap-2 text-primary">
        <Clock className="h-5 w-5" />
        <span className="text-2xl font-bold tabular-nums">{daysLeft}</span>
      </div>
      <div className="text-sm">
        <span className="font-semibold text-foreground">days remaining</span>
      </div>
    </div>
  );
}

// ─── Exam Preparedness ────────────────────────────────────────────────────────

function ExamPreparedness({ sessions }: { sessions: Session[] }) {
  const { user, signInWithGoogle, loading: authLoading } = useAuth();
  
  let percentage = 0;
  if (sessions && sessions.length > 0) {
     const recent = sessions.slice(0, 5);
     const totalQuestions = recent.reduce((sum, s) => sum + s.totalQuestions, 0);
     const totalScore = recent.reduce((sum, s) => sum + s.totalScore, 0);
     percentage = totalQuestions > 0 ? (totalScore / totalQuestions) * 100 : 0;
  }
  
  let color = "text-red-500";
  let stroke = "stroke-red-500";
  let motivation = "Keep practicing! Focus on your weakest subjects to boost your score.";
  
  if (percentage >= 80) {
    color = "text-emerald-500";
    stroke = "stroke-emerald-500";
    motivation = "Excellent! You're highly prepared. Keep maintaining this level.";
  } else if (percentage >= 60) {
    color = "text-yellow-500";
    stroke = "stroke-yellow-500";
    motivation = "Good progress! A little more study in specific areas will make you fully prepared.";
  } else if (percentage >= 40) {
    color = "text-orange-500";
    stroke = "stroke-orange-500";
    motivation = "You're getting there! Review the concepts you often miss to improve steadily.";
  }
  
  if (!authLoading && !user) {
    return (
      <Card className="shadow-sm relative overflow-hidden group">
        <CardHeader className="pb-3 bg-muted/20 dark:bg-muted/10 border-b">
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-md font-bold">Exam Preparedness</CardTitle>
              <CardDescription className="text-xs">See how prepared you are based on mock tests</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="relative blur-[6px] opacity-60 pointer-events-none select-none filter transition-all duration-300">
             <div className="flex justify-center py-4">
                <div className="relative w-48 h-24 overflow-hidden mb-2">
                   <div className="absolute top-4 left-1/2 -translate-x-1/2 w-40 h-20 rounded-t-full border-[16px] border-muted border-b-0" />
                </div>
             </div>
             <div className="text-center text-3xl font-bold pb-8">--%</div>
          </div>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/20 backdrop-blur-[2px] p-6 text-center z-10">
            <div className="bg-card p-5 rounded-xl shadow-lg border w-full max-w-xs flex flex-col items-center space-y-3">
               <Gauge className="h-8 w-8 text-primary opacity-80" />
               <p className="text-sm font-medium">Sign in to unlock personalized exam preparedness insights</p>
               <Button
                onClick={async () => {
                  try {
                    await signInWithGoogle();
                  } catch(e) {
                    console.error(e);
                  }
                }}
                className="w-full gap-2 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground mt-2"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!sessions || sessions.length === 0) {
     return (
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Exam Preparedness</CardTitle>
          </div>
          <CardDescription>
            See how prepared you are based on your past mock tests.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center py-8">
           <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
             <Gauge className="h-6 w-6 text-muted-foreground/50" />
           </div>
           <p className="text-sm text-muted-foreground">
             Take your first mock test to see your preparedness level.
           </p>
        </CardContent>
      </Card>
     );
  }
  
  const radius = 64;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Exam Preparedness</CardTitle>
        </div>
        <CardDescription>
          Based on your last {Math.min(5, sessions.length)} mock test{Math.min(5, sessions.length) !== 1 ? 's' : ''}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pb-8">
        <div className="flex flex-col items-center">
          <div className="relative w-48 h-24 overflow-hidden mb-2">
            <svg viewBox="0 0 160 80" className="w-full h-full">
              <path
                d="M 16 70 A 64 64 0 0 1 144 70"
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                strokeLinecap="round"
                className="text-muted/30"
              />
              <path
                d="M 16 70 A 64 64 0 0 1 144 70"
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                strokeLinecap="round"
                className={stroke}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
              />
            </svg>
            <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center">
              <span className={`text-3xl font-extrabold ${color}`}>
                {percentage.toFixed(0)}%
              </span>
            </div>
          </div>
          <p className="text-sm text-center font-medium px-2 mt-4">
             {motivation}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Topic definitions ────────────────────────────────────────────────────────

const ALL_TOPICS_VALUE = "__all__";

const TOPIC_GROUPS: Record<string, { label: string; options: { value: string; label: string }[] }[]> = {
  language_english: [
    {
      label: "Language Proficiency (English)",
      options: [
        { value: "vocabulary_and_analogy", label: "Vocabulary and Analogy" },
        { value: "sentence_sequencing", label: "Sentence Sequencing and Arrangement" },
        { value: "sentence_completion", label: "Sentence Completion and Improvement" },
        { value: "identifying_error", label: "Identifying Error in the Sentence" },
        { value: "idiomatic_expression", label: "Idiomatic Expression" },
        { value: "related_pair_of_words", label: "Related Pair of Words" },
        { value: "correct_word_usage", label: "Correct Word Usage" },
      ],
    },
  ],
  language_filipino: [
    {
      label: "Language Proficiency (Filipino)",
      options: [
        { value: "bokabularyo_at_paghahalintulad", label: "Bokabularyo at Paghahalintulad" },
        { value: "pagkakasunod_ng_pangungusap", label: "Pagkakasunod-sunod ng Pangungusap" },
        { value: "pagkumpleto_ng_pangungusap", label: "Pagkumpleto at Pagpapabuti ng Pangungusap" },
        { value: "pagkilala_ng_mali", label: "Pagkilala ng Mali sa Pangungusap" },
        { value: "idyomatikong_ekspresyon", label: "Idyomatikong Ekspresyon" },
        { value: "magkaugnay_na_pares", label: "Magkaugnay na Pares ng Salita" },
        { value: "wastong_gamit_ng_salita", label: "Wastong Gamit ng Salita" },
      ],
    },
  ],
  math: [
    {
      label: "Mathematics",
      options: [
        { value: "algebra_numbers_integers", label: "Algebra of Numbers and Integers" },
        { value: "decimals_fractions_percent", label: "Decimals, Fractions and Percent" },
        { value: "scientific_notation", label: "Scientific Notation" },
        { value: "ratio_proportion", label: "Ratio and Proportion" },
        { value: "variations", label: "Variations" },
        { value: "statistics", label: "Statistics" },
        { value: "number_series_progressions", label: "Number Series and Progressions" },
        { value: "algebra_polynomials", label: "Algebra (Polynomials, Rational Expressions)" },
        { value: "plane_geometry", label: "Plane Geometry" },
        { value: "analytic_geometry", label: "Analytic Geometry" },
        { value: "trigonometry", label: "Trigonometry" },
        { value: "word_problems", label: "Word Problems (Coin, Age, Investment, etc.)" },
      ],
    },
  ],
  science: [
    {
      label: "Chemistry",
      options: [
        { value: "chem_matter", label: "Matter" },
        { value: "chem_energy", label: "Energy" },
        { value: "chem_phases_of_matter", label: "Phases of Matter" },
        { value: "chem_atomic_structure", label: "Atomic Structure" },
        { value: "chem_valence_dot_diagrams", label: "Valence and Dot Diagrams" },
        { value: "chem_quantum_numbers", label: "Quantum Numbers" },
        { value: "chem_ions_octet_rules", label: "Ions and Octet Rules" },
        { value: "chem_periodic_table", label: "Periodic Table and Periodic Trends" },
        { value: "chem_bonding", label: "Bonding" },
        { value: "chem_stoichiometry", label: "Stoichiometry" },
      ],
    },
    {
      label: "General Science",
      options: [
        { value: "gen_measurement", label: "Measurement" },
        { value: "gen_force", label: "Force" },
        { value: "gen_friction", label: "Friction" },
        { value: "gen_work", label: "Work" },
        { value: "gen_matter", label: "Matter" },
        { value: "gen_plasma_plastics_metal_alloy", label: "Plasma, Plastics, Metal, Alloy" },
        { value: "gen_biomass_fossil_fuels", label: "Biomass vs Fossil Fuels" },
        { value: "gen_water", label: "Water" },
        { value: "gen_air_pollutant", label: "Air Pollutant" },
        { value: "gen_materials_properties", label: "Materials Properties" },
        { value: "gen_melting_boiling", label: "Melting and Boiling Point" },
        { value: "gen_diffusion_osmosis", label: "Diffusion vs Osmosis" },
        { value: "gen_nuclear_fission", label: "Nuclear and Nuclear Fission" },
        { value: "gen_geothermal_energy", label: "Geothermal Energy" },
        { value: "gen_weather_climate", label: "Weather and Climate" },
        { value: "gen_objects_space", label: "Objects in Space" },
        { value: "gen_layers_atmosphere", label: "Layers of Atmosphere" },
        { value: "gen_position_earth", label: "Position of Earth in the Universe" },
        { value: "gen_motion_earth", label: "Motion of Earth in Space" },
        { value: "gen_layers_earth", label: "Layers of Earth" },
        { value: "gen_rocks_minerals", label: "Rocks and Minerals" },
        { value: "gen_branches_of_science", label: "Branches of Science" },
        { value: "gen_moon", label: "Moon" },
      ],
    },
    {
      label: "Biology",
      options: [
        { value: "bio_living_things", label: "Living Things" },
        { value: "bio_cellular_energetics", label: "Cellular Energetics" },
        { value: "bio_genetics", label: "Genetics" },
        { value: "bio_cell_reproduction", label: "Cell Reproduction" },
        { value: "bio_heredity", label: "Heredity" },
        { value: "bio_diversity_organisms", label: "Diversity of Organisms" },
        { value: "bio_plants", label: "Plants" },
        { value: "bio_animal_structures", label: "Animal Structures and Functions (Body Systems)" },
        { value: "bio_evolution", label: "Evolution" },
        { value: "bio_animal_behavior", label: "Animal Behavior and Energy" },
      ],
    },
    {
      label: "Physics",
      options: [
        { value: "phys_subdivision", label: "Subdivision of Physics" },
        { value: "phys_measurement", label: "Measurement" },
        { value: "phys_scalar_vectors", label: "Scalar and Vectors" },
        { value: "phys_newton_laws", label: "Newton's Laws of Motion" },
        { value: "phys_momentum", label: "Momentum" },
        { value: "phys_work", label: "Work" },
        { value: "phys_energy", label: "Energy" },
      ],
    },
  ],
  reading_english: [],
  reading_filipino: [],
};

type SubjectId = "language_english" | "language_filipino" | "math" | "science" | "reading_english" | "reading_filipino";

const AVAILABLE_SUBJECTS: { id: SubjectId; label: string }[] = [
  { id: "language_english", label: "Language Proficiency (English)" },
  { id: "language_filipino", label: "Language Proficiency (Filipino)" },
  { id: "math", label: "Mathematics" },
  { id: "science", label: "Science" },
  { id: "reading_english", label: "Reading Comprehension (English)" },
  { id: "reading_filipino", label: "Reading Comprehension (Filipino)" },
];

// ─── Sample Gemini Prompt ─────────────────────────────────────────────────────

const SAMPLE_PROMPT = `Generate 20 UPCAT-level Language Proficiency (English) questions. Return ONLY a JSON array — no markdown, no extra text. Each item must follow this exact structure:

[
  {
    "id": "q_unique_id_1",
    "subject": "language_english",
    "topic": "vocabulary_and_analogy",
    "text": "INSTRUCTION: Choose the best answer.\\n\\nEPHEMERAL : LASTING ::",
    "choices": [
      {"id": "A", "text": "Fragile : Strong"},
      {"id": "B", "text": "Transient : Temporary"},
      {"id": "C", "text": "Permanent : Enduring"},
      {"id": "D", "text": "Beautiful : Radiant"}
    ],
    "correctAnswer": "A",
    "explanation": "Ephemeral means short-lived (opposite of lasting), just as fragile means easily broken (opposite of strong)."
  }
]

Subject values: language_english | language_filipino | math | science | reading_english | reading_filipino
Topic values (language_english): vocabulary_and_analogy | sentence_sequencing | sentence_completion | identifying_error | idiomatic_expression | related_pair_of_words | correct_word_usage`;

// ─── Topic Selector ───────────────────────────────────────────────────────────

function TopicSelector({
  subjectId,
  selectedTopics,
  onChange,
  disabled,
}: {
  subjectId: SubjectId;
  selectedTopics: string[];
  onChange: (topics: string[]) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const groups = TOPIC_GROUPS[subjectId] ?? [];
  if (groups.length === 0) return null;

  const allOptions = groups.flatMap((g) => g.options);
  const isAllSelected = selectedTopics.length === 0 || selectedTopics.includes(ALL_TOPICS_VALUE);

  const toggleAll = () => onChange([ALL_TOPICS_VALUE]);

  const toggleTopic = (value: string) => {
    if (isAllSelected) {
      onChange([value]);
      return;
    }
    if (selectedTopics.includes(value)) {
      const next = selectedTopics.filter((t) => t !== value);
      onChange(next.length === 0 ? [ALL_TOPICS_VALUE] : next);
    } else {
      const next = [...selectedTopics.filter((t) => t !== ALL_TOPICS_VALUE), value];
      onChange(next.length === allOptions.length ? [ALL_TOPICS_VALUE] : next);
    }
  };

  const displayLabel = isAllSelected
    ? "All Topics"
    : selectedTopics.length === 1
    ? allOptions.find((o) => o.value === selectedTopics[0])?.label ?? "1 topic"
    : `${selectedTopics.length} topics selected`;

  return (
    <div className="mt-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors",
          disabled && "opacity-40 cursor-not-allowed"
        )}
      >
        <BookOpen className="h-3.5 w-3.5" />
        <span>{displayLabel}</span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {open && !disabled && (
        <div className="mt-3 pl-1 space-y-4 border-l-2 border-border ml-1 pl-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id={`${subjectId}-all`}
              checked={isAllSelected}
              onCheckedChange={toggleAll}
            />
            <Label htmlFor={`${subjectId}-all`} className="text-sm font-semibold cursor-pointer">
              Select All Topics
            </Label>
          </div>

          {groups.map((group) => (
            <div key={group.label} className="space-y-2">
              {groups.length > 1 && (
                <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                  {group.label}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {group.options.map((opt) => (
                  <div key={opt.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`${subjectId}-${opt.value}`}
                      checked={!isAllSelected && selectedTopics.includes(opt.value)}
                      onCheckedChange={() => toggleTopic(opt.value)}
                    />
                    <Label
                      htmlFor={`${subjectId}-${opt.value}`}
                      className="text-xs cursor-pointer leading-tight"
                    >
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Prompt Generator Panel ───────────────────────────────────────────────────

function PromptGeneratorPanel({
  open,
  onClose,
  onUploaded,
  universityId,
}: {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
  universityId: string;
}) {
  const [genSelectedSubjects, setGenSelectedSubjects] = useState<Record<string, boolean>>(
    AVAILABLE_SUBJECTS.reduce((acc, s) => ({ ...acc, [s.id]: false }), {})
  );
  const [genItemCounts, setGenItemCounts] = useState<Record<string, number>>({
    language_english: 40,
    language_filipino: 40,
    math: 60,
    science: 60,
    reading_english: 40,
    reading_filipino: 40,
  });
  const [genSelectedTopics, setGenSelectedTopics] = useState<Record<string, string[]>>(
    AVAILABLE_SUBJECTS.reduce((acc, s) => ({ ...acc, [s.id]: [ALL_TOPICS_VALUE] }), {})
  );
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"generate" | "paste">("generate");

  const reset = () => {
    setPasteText("");
    setError("");
    setResult(null);
    setGeneratedPrompt("");
  };

  const buildPrompt = () => {
    const selected = AVAILABLE_SUBJECTS.filter((s) => genSelectedSubjects[s.id]);
    if (selected.length === 0) {
      setGeneratedPrompt("Select at least one subject above to generate a prompt.");
      return;
    }

    const quizName = universityId.toUpperCase();
    const parts: string[] = [];
    parts.push(`You are an expert ${quizName} question writer.`);
    parts.push("");
    parts.push("STRICT REQUIREMENTS:");
    parts.push("- Each question must only have exactly 4 choices: A, B, C, D.");
    parts.push(" Do not rush in generating question always triple check to fit the requirements of the callibrations. Remake questions that has error or does not meet the qualifications in these calibrations stated.")
    parts.push("- Do not reuse or rephrase your questions — generate entirely new questions each time do not just translate english quizzes to filipino and vice versa..");
    parts.push("- Exactly ONE choice is correct no other possible answers in the choices must be generated.");
    parts.push("- Include a clear, educational explanation for the correct answer (2-4 sentences).");
    parts.push("- Add instructions before each question where appropriate.");
    parts.push("- For Reading Comprehension (reading_english, reading_filipino): return plain text in the format specified in that section's OUTPUT FORMAT.");
    parts.push("- For ALL OTHER subjects (math, science, language_english, language_filipino): return a valid JSON array — no markdown, no code fences, no extra text.");
    parts.push(`Every question gets UNIVERSITY: ${quizName} / ID / SUBJECT / TOPIC / QUESTION / A) B) C) D) / CORRECT / EXPLANATION — no exceptions, no missing fields.`);
    parts.push("Identifying Error questions specifically: the 4 choice segments are bolded with **word** directly inside the sentence in the QUESTION field, AND also listed separately below as normal A) B) C) D) choices (matching the bolded text exactly) — so it works both for display and for your parser.");
    parts.push("Blank line between every question block for clean copy-paste (registers as separate questions, not one merged block).");
    parts.push("No extra headers, no meta-commentary, no 'Note:' preambles — just the raw question blocks, ready to paste straight into your site.");
    parts.push("");
    parts.push("CRITICAL — NO ASCII ART / DIAGRAM DRAWING:");
    parts.push("- Do NOT use ( ) or .----. for circles, or / \\ for triangles.");
    parts.push("- EXCEPTION: For DATA TABLES, you may use ASCII/markdown-style tables ( | Col1 | Col2 | with |------| dividers ). Tables are rendered as text.");
    parts.push("");
    parts.push("LABELING INSTRUCTIONS (IMPORTANT):");
    parts.push("- Always name vertices with letters for triangles and quadrilaterals: e.g. \"triangle ABC\", \"parallelogram ABCD\", \"kite ABCD\"");
    parts.push("- Name specific sides and angles when asked: e.g. \"side AB = 12 cm\", \"angle A = 45°\", \"interior angle at vertex B = 120°\"");
    parts.push("- For angle of elevation / depression problems, describe a right triangle with the angle at the base and the vertical side as the object height.");
    parts.push("- For parallel lines problems, mention \"parallel lines cut by a transversal\" and give angle measures.");
    parts.push("- For similar triangles, mention \"similar triangles\" and give the scale ratio.");
    parts.push("");
    parts.push("FORMATTING RULES:");
    parts.push("- Side lengths: write as plain numbers (e.g. \"side AB = 5\" or \"AB = 5 cm\"). Do NOT use a degree sign for lengths.");
    parts.push("- Angle measures: always include the degree sign (e.g. \"angle A = 30°\", \"45° angle\").");
    parts.push("- Right triangles: describe only the GIVEN values. If the hypotenuse is unknown, do NOT write its value in the text — the student must compute it.");
    parts.push("- Triangles: always write \"triangle ABC\" with three letters so the app labels the vertices correctly.");
    parts.push("");
    parts.push("For each question, use this exact structure:");
    parts.push(`[`);
    parts.push(`  {`);
    parts.push(`    "university": "${quizName}",`);
    parts.push(`    "id": "q_unique_id_here",`);
    parts.push(`    "subject": "subject_value",`);
    parts.push(`    "topic": "topic_value",`);
    parts.push(`    "text": "INSTRUCTION: ...\\n\\nQuestion text here",`);
    parts.push(`    "choices": [`);
    parts.push(`      {"id": "A", "text": "choice text"},`);
    parts.push(`      {"id": "B", "text": "choice text"},`);
    parts.push(`      {"id": "C", "text": "choice text"},`);
    parts.push(`      {"id": "D", "text": "choice text"}`);
    parts.push(`    ],`);
    parts.push(`    "correctAnswer": "A",`);
    parts.push(`    "explanation": "Explanation here.",`);
    parts.push(`    "diagram": { "shape": "rightTriangle", "vertices": ["A","B","C"], "sides": {"AB":"5","BC":"12","AC":"?"}, "angles": {"B":"30\u00b0"}, "show": ["vertices","sides","angles","rightAngleMark"] }  // ONLY include if the question has a geometric shape`);
    parts.push(`  }`);
    parts.push(`]`);
    parts.push("");
    parts.push("or if json/questions are too long use this format below so that it will not break when the user is copying it to the website and it will save daily tokens");
    parts.push("");
    parts.push(`UNIVERSITY: ${quizName}`);
    parts.push("ID: q_unique_id_here");
    parts.push("SUBJECT: subject_value");
    parts.push("TOPIC: topic_value");
    parts.push("QUESTION: question here");
    parts.push("A) choice text");
    parts.push("B) choice text");
    parts.push("C) choice text");
    parts.push("D) choice text");
    parts.push("CORRECT: a");
    parts.push("EXPLANATION: explanation here");
    parts.push(`DIAGRAM: { "shape": "rightTriangle", "vertices": ["A","B","C"], "sides": {"AB":"5","BC":"12","AC":"?"}, "angles": {"B":"30\u00b0"}, "show": ["vertices","sides","angles","rightAngleMark"] }  // ONLY include if the question has a geometric shape`);
    parts.push("");
    parts.push("Subject values: language_english | language_filipino | math | science | reading_english | reading_filipino");
    parts.push("");

    for (const subject of selected) {
      const count = genItemCounts[subject.id] || 10;
      const topics = genSelectedTopics[subject.id] ?? [ALL_TOPICS_VALUE];
      const isAll = topics.length === 0 || topics.includes(ALL_TOPICS_VALUE);
      const allTopicOptions = (TOPIC_GROUPS[subject.id] ?? []).flatMap((g) => g.options);
      const specificTopics = isAll ? allTopicOptions.map((t) => t.value) : topics;
      const topicLabels = specificTopics.map((t) => allTopicOptions.find((o) => o.value === t)?.label || t);

      parts.push(`--- ${subject.label} ---`);
      parts.push(`Generate exactly ${count} questions for ${subject.label}.`);

      if (isAll && topicLabels.length > 0) {
        const perTopic = Math.floor(count / topicLabels.length);
        const remainder = count % topicLabels.length;
        parts.push("");
        parts.push("DISTRIBUTE questions evenly across these topics:");
        topicLabels.forEach((label, i) => {
          const topicCount = i < remainder ? perTopic + 1 : perTopic;
          parts.push(`  - ${label}: ${topicCount} questions`);
        });
        parts.push("");
        parts.push("When 'All Topics' is selected, spread questions equally across the available topics so each topic gets fair representation.");
      } else if (!isAll && topicLabels.length > 0) {
        parts.push(`Focus ONLY on these topics: ${topicLabels.join(", ")}.`);
      }

      if (subject.id === "reading_english" || subject.id === "reading_filipino") {
        const lang = subject.id === "reading_english" ? "English" : "Filipino (Tagalog/Filipino language)";
        const passageCountMin = Math.ceil(count / 5);
        const passageCountMax = Math.ceil(count / 2);
        parts.push("");
        parts.push("[UPCAT READING COMPREHENSION CALIBRATION]");
        parts.push(`- Language: ${lang}.`);
        parts.push(`- Create ${passageCountMin} to ${passageCountMax} distinct passages.`);
        parts.push("Creat new passages and question every prompt you may never reuse any passages from previous sets. Use new topics, data, and sources every time");
        parts.push("- Passage types MUST be varied across the set. Use any of these: research paper excerpt, advertisement, essay, poem, short story excerpt, instruction manual, song lyrics, scientific article, historical document, newspaper editorial, persuasive speech, biography excerpt, interview transcript, or academic journal abstract.");
        parts.push("- Each passage must be substantial enough for 2-5 comprehension questions.");
        parts.push("  • Poems: 3-4 stanzas with a clear theme. Syllable counts for poems must be precisely calculated based on standard pronunciation rules without errors.");
        parts.push("  • Short stories: 3-6 sentences with a clear narrative arc.");
        parts.push("  • Research papers: 1-2 paragraphs with a clear thesis and supporting evidence.");
        parts.push("  • Advertisements: standard ad format with a clear call to action and persuasive elements.");
        parts.push("  • Essays: 3-5 sentences with a clear argument and conclusion.");
        parts.push("  • Song lyrics: 2-3 verses with a clear mood or message. You may get lyrics for popular songs from the internet.");
        parts.push("  • Instructions: a 5-10 steps or 2-3 headings with 5-10 steps numbered or step-by-step procedural text.");
        parts.push("  • Scientific articles: 1-2 paragraphs explaining a concept or phenomenon.");
        parts.push("  • Historical documents: a short excerpt with a clear historical context.");
        parts.push("  • Newspaper editorials: 3-5 sentences with a clear opinion or argument. You may get passages from the internet.");
        parts.push("  • Persuasive speeches: 3-5 sentences with a clear call to action.");
        parts.push("  • Biography excerpts: 1 paragraph about a person's life or achievement.");
        parts.push("  • Interview transcripts: 3-5 questions and answers with a clear topic.");
        parts.push("  • Academic journal abstracts: 1-2 paragraphs with a clear research question and methodology.");
        parts.push("You may freely get passages from the internet. Including the source.");
        parts.push("- If a passage involves data or a figure, represent it using ASCII art or a table directly in the text.");
        parts.push("CRITICAL CHOICE-DESIGN AND DISTINCTION RULES: • Tone Balance: Avoid an obvious '1 positive and 3 negative' structure that gives the answer away without reading. Balance the tone by using 2 negative and 2 positive options, or make all options share a similar tone (all positive or all negative) to ensure genuine text analysis.");
        parts.push("• Context Clues & Anchors: The correct answer option must explicitly incorporate context clues, such as exact words or specific phrases directly from the passage, to tightly anchor it to the text.");
        parts.push("• Distinct Logic Lines: Ensure all choices have clear distinctions and are far apart in their logic lines. Distractors (wrong answers) must be incorrect for distinct, clear-cut reasons (e.g., contradicting a fact, introducing unmentioned information, or reversing a cause-and-effect relationship).");
        parts.push("• No Ambiguity: Options must be structurally distinct to prevent overlapping cases, gray areas, or multiple potentially correct answers. There must be only one ironclad, logically undeniable correct answer.");
        parts.push("- Each passage must have 2 to 5 comprehension questions.");
        parts.push("Do NOT randomize or shuffle the order of questions across different passages. Keep all questions for Passage 1 together, then all questions for Passage 2, etc., following the exact, correct row-by-row sequence of any text or table presented.");
        parts.push("- Total questions across all passages must equal exactly " + count + ".");
        parts.push("- CRITICAL: Do NOT randomize the order of questions within a passage. Keep all questions for passage 1 together, then all questions for passage 2, etc. Ensure that all options (A, B, C, D) are completely written out and fully visible without getting cut off at the bottom.");
        parts.push("");
        parts.push("OUTPUT FORMAT FOR READING COMPREHENSION (plain text — NOT JSON):");
        parts.push("Use this exact plain text format. Provide the passage ONCE, followed by all its questions. Separate blocks with a blank line.");
        parts.push("");
        parts.push(`UNIVERSITY: ${quizName}`);
        parts.push("SUBJECT: Reading [English/Filipino]");
        parts.push("TOPIC: [topic name]");
        parts.push("PASSAGE: [full passage text here. Generate the passage ONCE.]");
        parts.push("");
        parts.push(`ID: ${universityId}_rc_[lang]_[number]`);
        parts.push("QUESTION: [question 1 text here for the above passage]");
        parts.push("A) [choice text]");
        parts.push("B) [choice text]");
        parts.push("C) [choice text]");
        parts.push("D) [choice text]");
        parts.push("CORRECT: [A/B/C/D]");
        parts.push("EXPLANATION: [brief explanation here]");
        parts.push("DIAGRAM: [optional JSON object for geometric shapes. Omit if no shape.]");
        parts.push("");
        parts.push(`ID: ${universityId}_rc_[lang]_[number+1]`);
        parts.push("QUESTION: [question 2 text for the same passage]");
        parts.push("A) [choice text]");
        parts.push("B) [choice text]");
        parts.push("C) [choice text]");
        parts.push("D) [choice text]");
        parts.push("CORRECT: [A/B/C/D]");
        parts.push("EXPLANATION: [brief explanation here]");
        parts.push("");
        parts.push("RULES:");
        parts.push("- DO NOT REPEAT the passage for every question. Generate the PASSAGE: block once, then list the ID: and QUESTION: blocks for that passage.");
        parts.push("- The PASSAGE area must contain ONLY the passage text. Do NOT put the question inside the PASSAGE area.");
        parts.push("- The QUESTION area must contain ONLY the question text. Do NOT put the passage inside the QUESTION area.");
        parts.push("- Keep all questions for the same passage together in the output, one after another.");
        parts.push("- All passage and question text must be in " + lang + ".");
        parts.push("- Test: main idea, inference, vocabulary in context, tone, author's purpose, detail recall, implied meaning, structural analysis, and rhetorical purpose.");
        parts.push("");
      }

      if (subject.id === "math") {
        parts.push("");
        parts.push("[UPCAT MATHEMATICS CALIBRATION]");
        parts.push("- Focus on: Number systems, algebraic expressions, functions, linear/quadratic equations, geometry, trigonometry, and word problems (age,coins,variations, mixture, motion, investment).");
        parts.push("- Keep calculations realistic, clean, and quickly solvable on scratch paper without messy long-form arithmetic. Don't make the questions confusing, impossible, difficult. Make it simple and straightforward that we can solve mentally and with scratch papers without the use of calculators. PLEASE USE THE REFERENCE MOCK EXAM VIDEOS AND REVIEWER IMAGES TO MAKE QUESTIONS.");
        parts.push("- Use ONLY Unicode math symbols and inline text — NEVER use LaTeX markup like $\\frac{}{}$ or $\\sqrt{}$.");
        parts.push("- For fractions: use inline format like 3/5, a/b, or Unicode ½, ⅔.");
        parts.push("- For square roots: use √ symbol like √2, √(x+3).");
        parts.push("- For exponents: use Unicode superscripts like x², x³, 2ⁿ.");
        parts.push("- For multiplication: use × or implied (e.g., 2x + 3).");
        parts.push("- For pi: use π. For degrees: use °.");
        parts.push("- Question stems must be short, punchy, direct, and get straight to the point without dense blocks of unnecessary text.");
        parts.push("Maintain 100% consistency with all official UPCAT review pages and mock test resources provided across our training sessions");
        parts.push("Math Reviewer Materials:** image_ad7fc1.png, image_ad7fc3.png, image_ad7fdb.png, image_ad7fde.png, image_ad7fe1.png, image_ad8019.png, image_ad801f.png, image_ad8038.png, image_ad803d.png (and related PME reviewer sheets).");
        parts.push("Reference Mock Exam Video 1:** https://www.youtube.com/watch?v=5mhI1ijHboc");
        parts.push("**Reference Mock Exam Video 2:** https://www.youtube.com/watch?v=ythY0Cr3CGA&start=364");
        parts.push("Mathematics Reviewer Pages (Verbatim Sources):** `image_11.png` (Questions 1–6: Ratios, algebraic sequence patterns, absolute value functions, odd/even property testing, radical equations, complex number sequences), `image_12.png` (Questions 7–12: Solving literal equations, logical paradox statements, inverse functions with radicals, consecutive odd integer division, arithmetic sequence terms, shaded area of concentric/eccentric circular regions), `image_13.png` (Questions 13–15: Ratio of circle circumferences, square inscribed in circle parameters, area of geometric black/shaded regions with inscribed triangles), `image_14.png` (Questions 17–21: Complex multi-person age word problems, parallelogram angle variables, diagonal angle intersections, input/output linear function patterns, variable-based arithmetic progressions), `image_15.png` (Questions 22–26: Quadratic inequality solution sets on number lines, age systems with products, triangle inequality/isosceles theorem limits, geometric triangle angle proofs, rational expression evaluations), `image_16.png` (Questions 27–35: Parallel lines transversal angles, exponential equations with base 2, polynomial function values, composite functions, domain of rational expressions, decimal-fraction conversions, sets union/intersection, large function evaluations, multi-angle triangle ratios), `image_17.png` (Questions 36–42: Number properties logic, exponential x-intercepts, angle bisector geometry equations, rational equation constraints, systems of linear equations, regular polygon exterior angles, factoring sum/difference of cubes), `image_18.png` (Questions 43–51: $2 times 2$ matrix determinants, consecutive angles in parallelograms, rational expression multiplication/reduction, basic number sequences, similar quadrilaterals properties, worker-days inverse variation, missing terms in geometric sequences, area ratios of similar pentagons, pencil tracking algebraic word systems), `image_19.png` (Questions 52–58: Permutations $nP_r$, integer side constraints of triangles, multi-concentration acid/salt mixture tracking, 4-digit even number permutations without repetition, intersecting secants circle theorems, parallel line equations, probability of dice sums), `image_20.png` (Questions 59–60: Surface area from cube volume, rates of growth vs. fixed benchmark height perspective word items).");
        parts.push("- IMPORTANT for Mathematics:");
        parts.push("- For questions involving geometry figures (triangles, polygons, circles, right triangles), use the \"diagram\" field instead of ASCII art.");
        parts.push("  The app auto-generates crisp SVG diagrams. Only include a diagram if the question actually has a shape.");
        parts.push("- Supported diagram shapes:");
        parts.push("  • circle, rightTriangle, isoscelesTriangle, equilateralTriangle, scaleneTriangle");
        parts.push("  • square, rectangle, parallelogram, trapezoid, isoscelesTrapezoid, rhombus, kite");
        parts.push("  • polygon, angle, parallelLines, similarTriangles, numberLine, barChart");
        parts.push("- For questions involving a graph, plot, or number line, also use the diagram field.");
        parts.push("- For tables and data: use markdown-style | Col1 | Col2 | with dividers.");
        parts.push("- For flowcharts / sequences: [Start] -> (Step 1) -> (Step 2) -> [End]");
        parts.push("");
        parts.push("DIAGRAM FIELD (only include if the question has a geometric shape):");
        parts.push(`  \"diagram\": {`);
        parts.push(`    \"shape\": \"rightTriangle\",  // choose from the list above`);
        parts.push(`    \"vertices\": [\"A\", \"B\", \"C\"],  // letter labels in order`);
        parts.push(`    \"sides\": { \"AB\": \"5\", \"BC\": \"12\", \"AC\": \"?\" },  // use \"?\" for unknown sides`);
        parts.push(`    \"angles\": { \"B\": \"30°\" },  // angle measures at vertices`);
        parts.push(`    \"show\": [\"vertices\", \"sides\", \"angles\", \"rightAngleMark\"]  // what to display`);
        parts.push(`  }`);
        parts.push("");
        parts.push("DIAGRAM RULES:");
        parts.push("- \"shape\": exact shape name from the list above.");
        parts.push("- \"vertices\": letters in order around the shape.");
        parts.push("- \"sides\": use vertex-pair names (AB, BC) or generic (a, b, c, base, equal).");
        parts.push("- Use \"?\" for any side the student must calculate.");
        parts.push("- \"angles\": vertex letter as key, value with degree sign (e.g. \"30°\").");
        parts.push("- \"show\": [\"vertices\", \"sides\", \"angles\", \"rightAngleMark\", \"heightDashed\"].");
        parts.push("- If the question has no shape, OMIT the \"diagram\" field entirely.");
        parts.push("");
      }

      if (subject.id === "science") {
        parts.push("");
        parts.push("[UPCAT SCIENCE CALIBRATION]");
        parts.push("- Focus strictly on foundational computational physics (basic forces, kinematics, motion) and core chemistry concepts (mass conservation, solutions) modeled directly after official test parameters.");
        parts.push ("**Core Benchmarks:** Maroon Bluebook and Review Masters Syntax/Difficulty Standards. Don't make the questions confusing, impossible, difficult. Make it simple and straightforward that we can solve mentally and with scratch papers without the use of calculators. PLEASE USE THE REFERENCE MOCK EXAM VIDEOS AND REVIEWER IMAGES TO MAKE QUESTIONS.");
        parts.push("- Questions should require genuine understanding, not just memorization of terms.");
        parts.push("- Use SI units where applicable.");
        parts.push("- Include scenario-based questions.");
        parts.push("- For any diagram (cell diagram, atom model, food web, etc.), represent it using ASCII art or a structured text description.");
        parts.push("  Example atom model:");
        parts.push("        e\u207b");
        parts.push("       /");
        parts.push("  (nucleus)");
        parts.push("       \\");
        parts.push("        e\u207b");
        parts.push("- For tables (periodic trends, data comparisons), use ASCII table format:");
        parts.push("  | Element | Atomic No. | Electronegativity |");
        parts.push("  |---------|------------|-------------------|");
        parts.push("Science Reviewer Pages (Verbatim Sources):** `image.png` (Questions 13–17: Chemical changes, motion graphs, periodic table trends, entropy, metamorphism), `image_2.png` (Questions 44–49: Experimental errors, meiosis, colligative properties, enzyme regulation, forces, ideal gas law), `image_3.png` (Questions 26–31: Free fall kinematics, stoichiometry gas volume, ecology niches, tonicity/osmosis, basic solutions), `image_4.png` (Questions 32–37: Sex-linked genetics, molecular solids, marine geology, scientific inquiry order, colloids/emulsions, experimental controls), `image_5.png` (Questions 38–43: Osmosis membranes, digestive surface area, entropy trends, continental drift, solar radiation, gas compression), `image_6.png` (Questions 18–25: Earthquakes/tsunamis, ionization energy, human physiology, planetary rotation, limiting reactants, hydrogen bonding, light scattering), `image_7.png` (Questions 50–55: Decomposers, uniform circular orbit forces, solubility factors, evolutionary adaptation, critical temperature, kinetic energy conservation), `image_8.png` (Questions 56–60: Rock cycles, monohybrid genetics crosses, electromagnetic wave speed in a vacuum, viral structure, plate tectonics boundaries), `image_9.png` (Questions 1–6: Blood types, Doppler effect wave types, evolutionary history, prokaryote vs. eukaryote features, nonrenewable resources, hypothesis testing definitions), `image_10.png` (Questions 7–12: Terrarium evaporation, homologous recombination, arthropod classification, pH properties, noble gas properties, concentration definitions).");
        parts.push("Reference Mock Exam Video 1:**https://youtu.be/rQ0xu1fVSI4?si=ll9rboKjJxMoKRY2");
        parts.push("**Reference Mock Exam Video 2:** https://youtu.be/fqNfjM4vnwk?si=wacD82tvovNV1p9_");
        parts.push("**Reference Mock Exam Video 3:** https://youtu.be/0iLnUy21EoM?si=SUGvES1AoHxlD4l5");
        parts.push("**Reference Mock Exam Video 4:** https://youtu.be/1cHevbqZj1o?si=n5PvmzunirSxmcr1");
        parts.push("**Reference Mock Exam Video 5:** https://youtu.be/ythY0Cr3CGA?si=MCoYzApyBSBEVb_-");
        parts.push("**Reference Mock Exam Video 6:** https://youtu.be/1cHevbqZj1o?si=dkQlhprLTmD9WlKw");
        parts.push("");
      }

      if (subject.id === "language_english" || subject.id === "language_filipino") {
        parts.push("");
        parts.push("[UPCAT LANGUAGE PROFICIENCY CALIBRATION]");
        parts.push(" Must strictly mirror the question patterns, straightforward style, word-level syntax rules, AND LEVEL OF DIFFICULTY demonstrated in the Maroon Bluebook and Review Masters pages,  also from the general reviewers BASICALLY ALL IMAGES THAT I HAVE SENT. Reduce question complexity to eliminate confusing, overly engineered sentences; ensure questions are NOT harder than these reference materials anchor everything directly to these images, reviewers, and images. Also CHECK the youtube links for the guide in making the questions. The designated correct_answer string must be DOUBLE-CHECKED against the linguistic rule before exporting to prevent wrong answer key mismatches. STRICTLY NO MORE over-engineered grammar scenarios.");
        parts.push("1. For Identifying Errors, there must be exactly 4 **bolded** choices labeled (A), (B), (C), and (D) embedded directly within the sentence.");
        parts.push("- short, concise segments. I will exclude extraneous nouns or correct phrases that are not part of the grammatical trap. Only the specific words/segments provided in the choices will be **bolded** in the sentence and the list...");
        parts.push("Dangling modifiers or faulty comparisons that require rewriting the entire sentence or altering unmarked clauses are strictly prohibited. The grammatical flaw must be isolated and completely resolved by changing or substituting only the text inside the single incorrect option (e.g., verb tense/aspect, subject-verb agreement, pronoun case/consistency, or direct KWF particle rules). No extended sentence restructuring is allowed. STRICTLY NO more over-engineered grammar scenarios.");
        parts.push("The sentence structures are short, punchy, and direct instead of overly long or complex. STRICTLY NO more over-engineered grammar scenarios.");
        parts.push("The traps target high-yield categories like verb tense parallelism, pronoun consistency, and subject-verb agreement.");
        parts.push("The errors are solved solely by replacing the single incorrect choice word directly without modifying any surrounding sentence clauses.");
        parts.push("Linguistic Ear-Test Rule: The grammar flaw must be written so that it creates an immediate, unnatural speedbump in a native speaker's head. When reading the line, the test-taker should instantly say, 'No one talks like that—this sounds completely wrong,' leading them directly to the correct answer choice.");
        parts.push("- SENTENCE LENGTH & DIFFICULTY image_ad0f1e.png Sentences must be short, punchy, single- or dual-clause structures. Do not make them overly long, over-engineered or verbose");
        parts.push("- Traps must be high-yield and realistic (e.g., aspectual/tense parallelism, proximity/collective agreement rules, pronoun consistency, ng/nang distinctions, or context vocabulary)");
        parts.push("- do not output a separate A, B, C, D choice list block underneath the sentence the selections are fully integrated directly inside the line");
        parts.push("- Multi-Layered Complexity: Questions must feature sentences where  grammatical rules are contested (e.g., testing Mayroon usage + enclitic placement + particle usage in a single sentence). Do not test one simple error per sentence; create a complex, plausible structure where the error is subtle.");
        parts.push("- One, and only one, definitive error per sentence. The remaining options must be grammatically correct. Ensure the target choices strictly label the true intended structural flaw and do not mistake correct parts of speech or misidentify modifiers.");
        parts.push("Ensure the correct answer choice is entirely absent from the un-filled or raw sentence stem so it never spoils its own question.");
        parts.push("- Scope: English: Misplaced modifiers, parallelism/false comparisons, count vs. non-count quantity, and idiom-based structural errors. and in Filipino: syntax/semantics: May/Mayroon distinction, Ng/Nang/Ni/Nina/Sina/Kina usage (noting that formal grammar favors 'at' for joining compound subjects over colloquial 'ni' strings), enclitic placement din/dito/doon/diyan if the preceding word ends in a consonant (katinig), excluding w and y, rin/roon/raw/riyan if the preceding word ends in a vowel (patinig) or the semi-vowels w and; lang/na/pa, paggamit ng gitling, verb focus/aspect, and pang-angkop rules. When testing mechanical particles like din/rin or daw/raw, all incorrect options must use conflicting phonetic rules (e.g., pairing a correct D-word only with R-words) to prevent context or semantic variation from creating a double correct answer.");
        parts.push("2. Sequencing Use SHORT phrases or narrative elements labeled 1 to 4. Below the text, provide four options lettered A., B., C., D. using clean, hyphenated sorting strings e.g., A. x-x-x-x (shuffle numbers) Do not also make this part confusing");
        parts.push("- Sentence Sequencing and Arrangement questions must exclusively focus on rhetorical coherence, paragraph logic, and sentence/clause flow.");
        parts.push("- PROHIBITED: Do not generate procedural steps, lists of actions, or how-to sequences");
        parts.push("- REQUIREMENT: Questions must present randomized sentences or discourse fragments that require reordering to form a unified, logical, and coherent paragraph.");
        parts.push("3. Vocabulary & Idioms  Feature a targeted word in full UPPERCASE in a short sentence. Options A., B., C., D. underneath must be completely lowercase unless proper nouns");
        parts.push("- For all vocabulary and definition questions (e.g., Ang kahulugan ng...), the explanation field MUST explicitly include the clear definition, synonyms, or the semantic context of the target word to ensure educational value.");
        parts.push("- Vocabulary questions must provide a context sentence with the target word CAPITALIZED instead of underlined, ensuring that complex target words are paired with simple, easily understood answer choices.");
        parts.push("- Ensure that the correct answer is an objective, widely accepted synonym or definition of the target word. AVOID ambiguous OR overly broad distractors where multiple answers could reasonably be interpreted as correct. Context sentences must be deliberately structured so that multiple distractors can realistically fit the blank semantically (e.g., an (iskolar) can logically be smart, poor, or hardworking), leaving only one direct antonym/mismatch while forcing the student to know the exact definition of the target word rather than guessing by context flow alone.");
        parts.push("- For analogy questions, You are strictly banned from making items where multiple options share the same relationship type, forcing subjective, overly deep guessing.).");
        parts.push("For all analogy items, do NOT make the choices close to each other. For example, if the target given is part-to-whole, only the single correct option can be a part-to-whole relationship. All other choices must utilize completely different logical dynamics so the correct answer is completely clean and distinct.")
        parts.push("4. Spelling  Present four lowercase options testing standard high-frequency trap configurations e.g., accommodate vs. accommodatee");
        parts.push("5. Sentence Completion  Use a clean, blank line _______ inside a concise sentence. Options A., B., C., D. underneath must be lowercase and focus on strict morphological or particle usage. Pay close attention to precise surface vs. object focus markers.");
        parts.push("6. NO FILLER: Output must be delivered directly with zero conversational prefaces, warnings, or commentary unless explicitly asked.");
        parts.push("Formatting Rule: Contextual instruction headers, prefaces, and question prompts are stylistically preserved for all standard question types to maintain the authentic exam format. However, for word-pairing and analogy questions only, all directives and relationship instructions are strictly removed from the item generation to prevent spoiling the testing pairings or analogy contexts; these items must start immediately with the raw word pair or stem.");
        parts.push ("Grammar Authority: All standard grammar rules, morphological patterns, syntactical judgments, and phrase markers generated or checked by the system must adhere strictly to the definitive authority of the Komisyon sa Wikang Filipino (KWF) and Lope K. Santos's Balarila ng Wikang Pambansa. All question evaluations and explanations must discard flawed reviewer traps in favor of these official standard references");
        parts.push("**Reference Mock Exam Video 1:** https://youtu.be/ljfgWPLEaQA?si=NC3VKHDy92SBGe4m");
        parts.push("**Reference Mock Exam Video 2:** https://youtu.be/bpmvYAIpekM?si=pNRgjxYStZfABqBW");
        parts.push("STRICTLY FOLLOW THIS CALLIBRATION AND ALL CALLIBRATIONS HAVE TALKED ABOUT IN THE ENTIERY OF OUR CHAT")
        parts.push("");
      }

      parts.push("");
    }

    parts.push("For JSON subjects: return the complete JSON array with ALL questions. Make sure every question has a unique 'id' across the entire array.");
    parts.push("For Reading Comprehension: return all questions in the plain text format, keeping questions for the same passage grouped together.");
    parts.push("For plain text format: you may also include a DIAGRAM: line with a compact JSON object if the question has a shape.");

    const prompt = parts.join("\n");
    setGeneratedPrompt(prompt);
    setCustomPrompt(prompt);
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(customPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const parseAndSave = (jsonText: string) => {
    setError("");
    setResult(null);
    const text = jsonText.trim();

    // Helper: try to parse as simple text format first, then JSON
    const tryParse = (): BankQuestion[] | null => {
      // 1. Try strict JSON
      try {
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) return null;
        const valid: BankQuestion[] = [];
        for (const item of parsed) {
          if (
            typeof item.id === "string" &&
            typeof item.subject === "string" &&
            typeof item.text === "string" &&
            Array.isArray(item.choices) &&
            typeof item.correctAnswer === "string"
          ) {
            const q: BankQuestion = {
              id: item.id,
              subject: item.subject,
              topic: item.topic,
              text: item.text,
              imageUrl: item.imageUrl,
              passageId: item.passageId,
              choices: item.choices,
              correctAnswer: item.correctAnswer,
              explanation: item.explanation ?? "",
            };
            if (item.diagram) q.diagram = item.diagram;
            valid.push(q);
          }
        }
        return valid.length > 0 ? valid : null;
      } catch {
        // Not valid JSON, try text format
      }

      // 2. Try simple text format (ID:, SUBJECT:, PASSAGE:, QUESTION:, A), B), C), D), CORRECT:, EXPLANATION:)
      const blocks = text.split(/\n-{3,}\n|\n\n(?=UNIVERSITY:\s|ID:\s|PASSAGE:\s|SUBJECT:\s)/i).filter((b) => b.trim().length > 0);
      const valid: BankQuestion[] = [];
      let currentPassageId = 0;
      let lastPassageText = "";

      let persistentSubject = "";
      let persistentTopic = "";
      let persistentPassage = "";

      for (let blockIdx = 0; blockIdx < blocks.length; blockIdx++) {
        const block = blocks[blockIdx].trim();
        if (!block) continue;

        const lines = block.split("\n");
        let id = "";
        let currentBlockSubject = "";
        let currentBlockTopic = "";
        let currentBlockPassage = "";
        let hasExplicitPassage = false;
        let question = "";
        const choices: { id: string; text: string }[] = [];
        let correctAnswer = "";
        let explanation = "";
        let diagram: any = undefined;

        let i = 0;
        while (i < lines.length) {
          const line = lines[i];
          const upper = line.toUpperCase();

          if (upper.startsWith("ID:")) {
            id = line.slice(3).trim();
            i++;
          } else if (upper.startsWith("SUBJECT:")) {
            currentBlockSubject = line.slice(8).trim();
            i++;
          } else if (upper.startsWith("TOPIC:")) {
            currentBlockTopic = line.slice(6).trim();
            i++;
          } else if (upper.startsWith("PASSAGE:")) {
            hasExplicitPassage = true;
            // Collect multi-line passage until QUESTION: or A) or end of block
            const start = line.startsWith("PASSAGE:") ? line.slice(8).trim() : "";
            const passageLines: string[] = start ? [start] : [];
            i++;
            while (i < lines.length) {
              const next = lines[i];
              const nextUpper = next.toUpperCase();
              if (
                nextUpper.startsWith("QUESTION:") ||
                nextUpper.startsWith("A)") ||
                nextUpper.startsWith("A.") ||
                nextUpper.startsWith("CORRECT:") ||
                nextUpper.startsWith("EXPLANATION:") ||
                nextUpper.startsWith("ID:")
              ) {
                break;
              }
              passageLines.push(next);
              i++;
            }
            currentBlockPassage = passageLines.join("\n").trim();
          } else if (upper.startsWith("QUESTION:")) {
            const start = line.slice(9).trim();
            const qLines: string[] = start ? [start] : [];
            i++;
            while (i < lines.length) {
              const next = lines[i];
              const nextUpper = next.toUpperCase();
              if (
                nextUpper.startsWith("A)") ||
                nextUpper.startsWith("A.") ||
                nextUpper.startsWith("1.") ||
                nextUpper.startsWith("CORRECT:") ||
                nextUpper.startsWith("EXPLANATION:") ||
                nextUpper.startsWith("ID:")
              ) {
                break;
              }
              qLines.push(next);
              i++;
            }
            question = qLines.join("\n").trim();
          } else if (/^[A-D][).]\s*/.test(line)) {
            const match = line.match(/^([A-D])[).]\s*(.*)$/);
            if (match) {
              choices.push({ id: match[1], text: match[2].trim() });
            }
            i++;
          } else if (upper.startsWith("CORRECT:")) {
            correctAnswer = line.slice(8).trim();
            i++;
          } else if (upper.startsWith("EXPLANATION:")) {
            const start = line.slice(12).trim();
            const expLines: string[] = start ? [start] : [];
            i++;
            while (i < lines.length) {
              const next = lines[i];
              const nextUpper = next.toUpperCase();
              if (nextUpper.startsWith("ID:") || nextUpper.startsWith("---") || nextUpper.startsWith("DIAGRAM:")) {
                break;
              }
              expLines.push(next);
              i++;
            }
            explanation = expLines.join("\n").trim();
          } else if (upper.startsWith("DIAGRAM:")) {
            const start = line.slice(8).trim();
            const diagramLines: string[] = start ? [start] : [];
            i++;
            while (i < lines.length) {
              const next = lines[i];
              const nextUpper = next.toUpperCase();
              if (nextUpper.startsWith("ID:") || nextUpper.startsWith("---")) {
                break;
              }
              diagramLines.push(next);
              i++;
            }
            try {
              const diagramText = diagramLines.join("\n").trim();
              if (diagramText) {
                const parsed = JSON.parse(diagramText);
                if (parsed && typeof parsed === "object") {
                  diagram = parsed;
                }
              }
            } catch {
              // Invalid diagram JSON, skip silently
            }
          } else {
            i++;
          }
        }

        if (currentBlockSubject !== "") {
          if (currentBlockSubject !== persistentSubject) {
             persistentTopic = "";
             persistentPassage = "";
          }
          persistentSubject = currentBlockSubject;
        }
        if (currentBlockTopic !== "") persistentTopic = currentBlockTopic;
        if (hasExplicitPassage) persistentPassage = currentBlockPassage;

        const subject = currentBlockSubject || persistentSubject;
        const topic = currentBlockTopic || persistentTopic;
        const passage = hasExplicitPassage ? currentBlockPassage : persistentPassage;

        if (!id || !subject || choices.length < 2) continue;

        // Map human-readable subject names to internal IDs
        const subjectMap: Record<string, string> = {
          "READING FILIPINO": "reading_filipino",
          "READING ENGLISH": "reading_english",
          "LANGUAGE FILIPINO": "language_filipino",
          "LANGUAGE ENGLISH": "language_english",
          "FILIPINO LANGUAGE": "language_filipino",
          "ENGLISH LANGUAGE": "language_english",
          "MATHEMATICS": "math",
          "MATH": "math",
          "SCIENCE": "science",
        };
        const subjectKey = subject.toUpperCase();
        const mappedSubject = subjectMap[subjectKey] || subject.toLowerCase().replace(/\s+/g, "_");

        // Build text field
        let text = "";
        if (passage && question) {
          text = `PASSAGE:\n${passage}\n\nQUESTION: ${question}`;
        } else if (passage) {
          text = `PASSAGE:\n${passage}`;
        } else if (question) {
          text = question;
        } else {
          text = "";
        }

        // For reading comprehension: assign passageId based on passage content
        // so questions with the same passage share the same ID and group together
        let passageId: string | undefined = undefined;
        if (passage) {
          if (passage === lastPassageText) {
            // Same passage as previous question, reuse current ID
            passageId = `p${currentPassageId}`;
          } else {
            // New passage, increment ID
            currentPassageId++;
            passageId = `p${currentPassageId}`;
            lastPassageText = passage;
          }
        }

        const q: BankQuestion = {
          id,
          subject: mappedSubject,
          topic: topic || undefined,
          text,
          passageId,
          choices,
          correctAnswer: correctAnswer.toUpperCase(),
          explanation: explanation || "",
        };
        if (diagram) q.diagram = diagram;
        valid.push(q);
      }

      return valid.length > 0 ? valid : null;
    };

    const valid = tryParse();
    if (valid === null) {
      setError("Could not parse input. Paste a valid JSON array OR use the simple text format (ID:, SUBJECT:, PASSAGE:, QUESTION:, A), B), C), D), CORRECT:, EXPLANATION:, DIAGRAM:).");
      return;
    }

    const res = addBankQuestions(valid, universityId);
    setResult(res);
    onUploaded();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      parseAndSave(text);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) { reset(); onClose(); } }}>
      <div className="bg-background border-2 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-primary" />
                Upload Questions to Bank
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Configure your test, generate a prompt for Gemini or Deepseek, then paste the questions back.
              </p>
            </div>
            <button
              onClick={() => { reset(); onClose(); }}
              className="text-muted-foreground hover:text-foreground transition-colors text-2xl leading-none ml-4"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            <button
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === "generate"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setActiveTab("generate")}
            >
              <Sparkles className="h-4 w-4 inline mr-1.5" />
              1. Generate Prompt
            </button>
            <button
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === "paste"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setActiveTab("paste")}
            >
              <Upload className="h-4 w-4 inline mr-1.5" />
              2. Paste Questions
            </button>
          </div>

          {activeTab === "generate" && (
            <div className="space-y-4">
              {/* Subject selectors */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Select subjects and topics:</p>
                {AVAILABLE_SUBJECTS.map((subject) => {
                  const isSelected = genSelectedSubjects[subject.id];
                  const hasTopics = (TOPIC_GROUPS[subject.id] ?? []).length > 0;
                  return (
                    <div key={subject.id} className={cn("rounded-lg border p-3", isSelected ? "bg-card" : "bg-muted/30 opacity-60")}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(v) =>
                              setGenSelectedSubjects((prev) => ({ ...prev, [subject.id]: v as boolean }))
                            }
                          />
                          <span className="text-sm font-semibold">{subject.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <NumberInput
                            min={1}
                            max={100}
                            className="w-16 text-center"
                            disabled={!isSelected}
                            value={genItemCounts[subject.id]}
                            onChange={(val) =>
                              setGenItemCounts((prev) => ({
                                ...prev,
                                [subject.id]: val,
                              }))
                            }
                          />
                          <span className="text-sm text-muted-foreground">items</span>
                        </div>
                      </div>
                      {hasTopics && isSelected && (
                        <TopicSelector
                          subjectId={subject.id}
                          selectedTopics={genSelectedTopics[subject.id] ?? [ALL_TOPICS_VALUE]}
                          onChange={(topics) =>
                            setGenSelectedTopics((prev) => ({ ...prev, [subject.id]: topics }))
                          }
                          disabled={false}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <Button onClick={buildPrompt} className="w-full gap-2">
                <Sparkles className="h-4 w-4" />
                Generate Prompt
              </Button>

              {generatedPrompt && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Prompt for AI chatbot</span>
                    <Button size="sm" variant="outline" onClick={copyPrompt} className="gap-1 h-7 text-xs">
                      <Copy className="h-3 w-3" />
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                  <textarea
                    className="w-full text-xs bg-muted border rounded p-3 font-mono min-h-[160px] resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    1. Edit the prompt above if needed → 2. Click Copy → 3. Go to <strong>gemini.google.com or chat.deepseek.com/</strong> → 4. Paste it → 5. Copy the questions it returns → 6. Switch to "Paste Questions" tab
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "paste" && (
            <div className="space-y-4">
              {/* File upload */}
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
                  <Upload className="h-4 w-4" />
                  Upload .json or .txt file
                </Button>
                <span className="text-sm text-muted-foreground">or paste text/JSON below</span>
                <input ref={fileInputRef} type="file" accept=".json,.txt,application/json,text/plain" className="hidden" onChange={handleFile} />
              </div>

              <div className="space-y-1">
                <Label htmlFor="paste-json" className="text-sm font-medium">Paste questions from AI chatbot (JSON or text format)</Label>
                <textarea
                  id="paste-json"
                  className="w-full min-h-[140px] rounded-md border bg-background px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder={'ID: q1\nSUBJECT: Language English\nTOPIC: Vocabulary\nQUESTION: What is the meaning of PERTINENT?\nA) relevant\nB) distant\nC) vague\nD) trivial\nCORRECT: A\nEXPLANATION: Pertinent means relevant or applicable to a particular matter.\nDIAGRAM: {"shape":"rightTriangle","vertices":["A","B","C"],"sides":{"AB":"5","BC":"12","AC":"?"},"angles":{"B":"30°"},"show":["vertices","sides","angles","rightAngleMark"]}\n\n---\n\nOr paste a JSON array: [{...}]'}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded p-3">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {result && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 dark:bg-green-950/30 rounded p-3">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>
                    <strong>{result.added}</strong> questions added to bank.
                    {result.skipped > 0 && <span className="text-muted-foreground"> ({result.skipped} duplicates skipped)</span>}
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button onClick={() => parseAndSave(pasteText)} disabled={!pasteText.trim()}>
                  Save to Bank
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Paginated Sessions Component ─────────────────────────────────────────────

const SESSIONS_PER_PAGE = 5;

function PaginatedSessions({
  sessions,
  onReview,
  universityId,
}: {
  sessions: Session[];
  onReview: (id: string) => void;
  universityId: string;
}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(sessions.length / SESSIONS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  if (safePage !== page) setPage(safePage);

  const start = (safePage - 1) * SESSIONS_PER_PAGE;
  const pageSessions = sessions.slice(start, start + SESSIONS_PER_PAGE);

  return (
    <div>
      <div className="divide-y">
        {pageSessions.map((session, idx) => {
          const correct = session.correctCount ?? (session.answers as any[]).filter((a: any) => a.isCorrect).length;
          const wrong = session.wrongCount ?? (session.answers as any[]).filter((a: any) => !a.isCorrect && !a.isBlank).length;
          const pct = Math.round((correct / session.totalQuestions) * 100);
          const score = universityId === "upcat" ? Math.max(0, correct - 0.25 * wrong) : correct;
          const sessionNum = sessions.length - start - idx; // newest = highest number, oldest = #1
          const uniqueSubjects = Array.from(new Set((session.answers || []).map((a: any) => a.subject).filter(Boolean)));
          const subjectsLabel = uniqueSubjects.length === 0
            ? "General Test"
            : uniqueSubjects.length === 1
              ? (SUBJECT_LABELS[uniqueSubjects[0] as string] || uniqueSubjects[0])
              : uniqueSubjects.length <= 2
                ? uniqueSubjects.map((s: any) => SUBJECT_LABELS[s] || s).join(", ")
                : `Mixed (${uniqueSubjects.length} subjects)`;
          return (
            <div
              key={session.id}
              className="flex flex-col gap-2 p-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-0.5 min-w-0">
                  <div className="font-semibold text-foreground flex items-center gap-1.5 text-sm">
                    <span className="text-muted-foreground font-normal">#{sessionNum}</span>
                    <span className="text-primary">{score.toFixed(2)}</span>
                    <span className="text-muted-foreground font-normal text-xs">/ {session.totalQuestions}</span>
                  </div>
                  <div className="text-[11px] font-medium text-muted-foreground bg-muted/60 dark:bg-muted/30 border border-border/60 rounded px-1.5 py-0.5 inline-block my-0.5 max-w-full truncate">
                    {subjectsLabel}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(session.createdAt).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="text-green-600">✓{correct}</span>
                    <span className="text-red-500">✗{wrong}</span>
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(session.timeTakenSeconds ?? 0)}</span>
                  </div>
                </div>
                <Badge
                  variant={pct >= 75 ? "default" : pct >= 50 ? "secondary" : "destructive"}
                  className="text-xs shrink-0 ml-2"
                >
                  {pct}%
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full h-7 text-xs"
                onClick={() => onReview(session.id)}
              >
                Review & Explanations
                <ArrowRight className="ml-1.5 h-3 w-3" />
              </Button>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-3 w-3" />
            Prev
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {safePage} of {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function UniversityPage({ params }: { params: { id: string } }) {
  const [, setLocation] = useLocation();
  const { setUniversityId, setQuestions, setTimeRemaining, setStatus, resetTest, questions, status } = useTest();

  useEffect(() => {
    setUniversityId(params.id);
  }, [params.id, setUniversityId]);

  const [selectedSubjects, setSelectedSubjects] = useState<Record<string, boolean>>(
    AVAILABLE_SUBJECTS.reduce((acc, s) => ({ ...acc, [s.id]: false }), {})
  );
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({
    language_english: 40,
    language_filipino: 40,
    math: 60,
    science: 60,
    reading_english: 40,
    reading_filipino: 40,
  });
  const [selectedTopics, setSelectedTopics] = useState<Record<string, string[]>>(
    AVAILABLE_SUBJECTS.reduce((acc, s) => ({ ...acc, [s.id]: [ALL_TOPICS_VALUE] }), {})
  );

  const [showUpload, setShowUpload] = useState(false);
  const [bankStats, setBankStats] = useState<{ total: number; unused: number }>({ total: 0, unused: 0 });
  const [startError, setStartError] = useState("");

  const { user } = useAuth();
  const [pastSessions, setPastSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [bankSyncing, setBankSyncing] = useState(false);
  const [bankSyncMsg, setBankSyncMsg] = useState("");
  const [syncFailed, setSyncFailed] = useState(false);

  const refreshBankStats = useCallback(() => {
    setBankStats(getBankStats(params.id));
  }, [params.id]);

  const handleSyncBank = useCallback(async () => {
    if (!user) return;
    setBankSyncing(true);
    setBankSyncMsg("Saving changes to your account...");
    try {
      await uploadBankToFirestore(user.uid, params.id);
      setBankSyncMsg("Question bank saved to your account.");
      setSyncFailed(false);
      setTimeout(() => {
        setBankSyncMsg((prev) => prev === "Question bank saved to your account." ? "" : prev);
      }, 4000);
    } catch (err: any) {
      console.error(err);
      setSyncFailed(true);
      setBankSyncMsg(`Sync failed: ${err.message || "Unknown error"}`);
    } finally {
      setBankSyncing(false);
    }
  }, [user, params.id]);

  useEffect(() => {
    if (!user) {
      setPastSessions([]);
      return;
    }
    setIsLoadingSessions(true);
    listSessions(user.uid, params.id)
      .then(setPastSessions)
      .catch((err) => {
        console.error("[Dashboard] Failed to load past sessions:", err);
        setPastSessions([]);
      })
      .finally(() => setIsLoadingSessions(false));

    const doSync = () => {
      setBankSyncMsg("Syncing question bank with your account...");
      setSyncFailed(false);
      syncBankWithFirestore(user.uid, params.id)
        .then(({ merged }) => {
          setSyncFailed(false);
          if (merged > 0) {
            refreshBankStats();
            setBankSyncMsg(`Synced latest questions from your account.`);
            setTimeout(() => {
              setBankSyncMsg((prev) => prev.startsWith("Synced") ? "" : prev);
            }, 4000);
          } else {
            setBankSyncMsg("");
          }
        })
        .catch((err: any) => {
          console.error("[Dashboard] Bank sync failed:", err);
          setSyncFailed(true);
          setBankSyncMsg(`Sync failed: ${err.message || "Unknown error"}`);
        });
    };

    // Auto-sync on mount
    doSync();

    // Auto-sync on window focus to keep devices up to date
    const onFocus = () => doSync();
    window.addEventListener("focus", onFocus);
    
    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [user, params.id, refreshBankStats]);

  // Keep trying to sync every 4 seconds if it fails and user is logged in
  useEffect(() => {
    if (!user || !syncFailed || bankSyncing) return;

    const interval = setTimeout(() => {
      console.log("[Dashboard] Retrying failed bank sync...");
      handleSyncBank();
    }, 4000);

    return () => clearTimeout(interval);
  }, [user, syncFailed, bankSyncing, handleSyncBank]);

  useEffect(() => {
    refreshBankStats();
  }, [refreshBankStats]);

  const totalSeconds = useMemo(
    () => calcTotalSeconds(selectedSubjects, itemCounts),
    [selectedSubjects, itemCounts]
  );

  const totalQuestions = useMemo(() => {
    return Object.entries(selectedSubjects)
      .filter(([, v]) => v)
      .reduce((t, [s]) => t + (itemCounts[s] || 0), 0);
  }, [selectedSubjects, itemCounts]);

  const handleStartTest = () => {
    setStartError("");
    const subjectsToUse = Object.entries(selectedSubjects)
      .filter(([, v]) => v)
      .map(([subject]) => ({
        subject: subject as SubjectId,
        count: itemCounts[subject] || 10,
        topics: (selectedTopics[subject] ?? [ALL_TOPICS_VALUE]).includes(ALL_TOPICS_VALUE)
          ? []
          : selectedTopics[subject],
      }));

    if (subjectsToUse.length === 0) return;

    const picked: BankQuestion[] = [];
    const warnings: string[] = [];

    for (const { subject, count, topics } of subjectsToUse) {
      const qs = pickQuestions(subject, count, topics, params.id);
      if (qs.length === 0) {
        warnings.push(`No questions available for ${SUBJECT_LABELS[subject] || subject}.`);
        continue;
      }
      if (qs.length < count) {
        warnings.push(`Only ${qs.length} of ${count} questions available for ${SUBJECT_LABELS[subject] || subject}.`);
      }
      picked.push(...qs);
    }

    if (picked.length === 0) {
      setStartError("No questions available. Please upload questions first.");
      return;
    }

    if (warnings.length > 0) {
      setStartError(warnings.join(" "));
    }

    resetTest();
    setQuestions(picked as any);
    setTimeRemaining(totalSeconds);
    setStatus("running");
    setLocation("/test");
  };

  const handleClearBank = () => {
    clearBank(params.id);
    refreshBankStats();
    if (user) {
      handleSyncBank();
    }
  };

  const handleResetUsed = () => {
    resetUsedIds(params.id);
    refreshBankStats();
  };

  const isReady = status === "ready" && questions.length > 0;

  return (
    <Layout>
      <PromptGeneratorPanel
        open={showUpload}
        onClose={() => setShowUpload(false)}
        universityId={params.id}
        onUploaded={() => {
          refreshBankStats();
          if (user) {
            handleSyncBank();
          }
        }}
      />

      <div className="space-y-8">
        <div className="space-y-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              {params.id === 'upcat' ? "University of the Philippines - (UPCAT 2027)" : "Mock Test Configuration"}
            </h1>
            {params.id === 'upcat' && (
              <p className="text-lg font-semibold text-primary">
                August 1-2, 2026
              </p>
            )}
          </div>
          {params.id === 'upcat' && <UpcatCountdown />}
        </div>

        {/* Question Bank Status */}
        <Card className="border-2 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Question Bank
                </CardTitle>
                <CardDescription className="mt-1">
                  {bankStats.total === 0
                    ? "No questions uploaded yet. Upload questions from AI chatbots (Gemini/Deepseek) to get started."
                    : `${bankStats.total} questions total · ${bankStats.unused} unused`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" onClick={() => setShowUpload(true)} className="gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Questions
                </Button>
                {bankStats.unused < bankStats.total && bankStats.total > 0 && (
                  <Button size="sm" variant="outline" onClick={handleResetUsed} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Reset Used
                  </Button>
                )}
                {bankStats.total > 0 && (
                  <Button size="sm" variant="outline" onClick={handleClearBank} className="gap-2 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                    Clear Bank
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          {bankStats.total > 0 && (
            <CardContent className="pt-0 pb-3">
              <div className="flex items-center gap-3 text-sm">
                <Progress value={(bankStats.unused / bankStats.total) * 100} className="flex-1 h-2" />
                <span className="text-muted-foreground text-xs whitespace-nowrap">
                  {bankStats.unused} / {bankStats.total} unused
                </span>
              </div>
              {bankStats.unused === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  All questions have been used. Questions will repeat or upload more.
                </p>
              )}
              {bankSyncMsg && (
                <div className="mt-2 space-y-1">
                  <p className={cn(
                    "text-xs flex items-center gap-1.5 font-medium",
                    syncFailed 
                      ? "text-red-600 dark:text-red-400" 
                      : "text-blue-600 dark:text-blue-400"
                  )}>
                    {syncFailed ? (
                      <CloudOff className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <Cloud className="h-3.5 w-3.5 shrink-0 animate-pulse" />
                    )}
                    {bankSyncMsg}
                  </p>
                  {syncFailed && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5 leading-relaxed bg-amber-50 dark:bg-amber-950/20 p-2 rounded border border-amber-200/30">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>Warning: You can still use the questions, but your progress and new uploads will not sync with your account until connection is restored.</span>
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          )}
          {!bankStats.total && bankSyncMsg && (
            <CardContent className="pt-0 pb-3">
              <div className="space-y-1">
                <p className={cn(
                  "text-xs flex items-center gap-1.5 font-medium",
                  syncFailed 
                    ? "text-red-600 dark:text-red-400" 
                    : "text-blue-600 dark:text-blue-400"
                )}>
                  {syncFailed ? (
                    <CloudOff className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <Cloud className="h-3.5 w-3.5 shrink-0 animate-pulse" />
                  )}
                  {bankSyncMsg}
                </p>
                {syncFailed && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5 leading-relaxed bg-amber-50 dark:bg-amber-950/20 p-2 rounded border border-amber-200/30">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>Warning: You can still use the questions, but your progress and new uploads will not sync with your account until connection is restored.</span>
                  </p>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {startError && (
          <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-sm">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div>{startError}</div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* ── Config card & Past Sessions ── */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="border-2 shadow-sm">
              <CardHeader>
                <CardTitle>Configure Mock Test</CardTitle>
                <CardDescription>
                  Select subjects, choose topics, and set the number of items per subject.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {AVAILABLE_SUBJECTS.map((subject) => {
                  const isSelected = selectedSubjects[subject.id];
                  const hasTopics = (TOPIC_GROUPS[subject.id] ?? []).length > 0;
                  const secsPerItem = SECONDS_PER_ITEM[subject.id] ?? 60;
                  const subjectStats = getBankStats(params.id, subject.id);

                  return (
                    <div
                      key={subject.id}
                      className={cn(
                        "rounded-lg border p-4 transition-colors",
                        isSelected ? "bg-card" : "bg-muted/30 opacity-60"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={`subject-${subject.id}`}
                            checked={isSelected}
                            onCheckedChange={(v) =>
                              setSelectedSubjects((prev) => ({ ...prev, [subject.id]: v as boolean }))
                            }
                          />
                          <div>
                            <Label
                              htmlFor={`subject-${subject.id}`}
                              className="text-sm font-semibold cursor-pointer"
                            >
                              {subject.label}
                            </Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {secsPerItem}s per item
                              {subjectStats.total > 0 && (
                                <span className="ml-2 text-primary/70">· {subjectStats.unused} unused in bank</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <NumberInput
                            id={`count-${subject.id}`}
                            min={1}
                            max={100}
                            className="w-16 text-center"
                            disabled={!isSelected}
                            value={itemCounts[subject.id]}
                            onChange={(val) =>
                              setItemCounts((prev) => ({
                                ...prev,
                                [subject.id]: val,
                              }))
                            }
                          />
                          <span className="text-sm text-muted-foreground w-10">items</span>
                        </div>
                      </div>

                      {hasTopics && (
                        <TopicSelector
                          subjectId={subject.id}
                          selectedTopics={selectedTopics[subject.id] ?? [ALL_TOPICS_VALUE]}
                          onChange={(topics) =>
                            setSelectedTopics((prev) => ({ ...prev, [subject.id]: topics }))
                          }
                          disabled={!isSelected}
                        />
                      )}

                      {!hasTopics && subject.id.startsWith("reading") && (
                        <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5" />
                          Various passages with 2–5 questions each. No topic filter needed.
                        </p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row items-center justify-between bg-muted/50 p-6 border-t gap-4">
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-lg">{totalQuestions}</span>
                    <span className="text-muted-foreground">total questions</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Estimated time: </span>
                    <span className="font-semibold text-foreground">{formatTime(totalSeconds)}</span>
                  </div>
                </div>
                <Button
                  size="lg"
                  className="w-full sm:w-auto font-semibold"
                  onClick={handleStartTest}
                  disabled={totalQuestions === 0 || bankStats.total === 0}
                >
                  <PlayCircle className="mr-2 h-5 w-5" />
                  Start Test
                </Button>
              </CardFooter>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">Past Sessions</CardTitle>
                  </div>
                  {pastSessions.length > 0 && (
                    <span className="text-xs text-muted-foreground">{pastSessions.length} session{pastSessions.length !== 1 ? "s" : ""}</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingSessions ? (
                  <div className="space-y-3 p-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : pastSessions && pastSessions.length > 0 ? (
                  <PaginatedSessions
                    sessions={pastSessions}
                    onReview={(id) => setLocation(`/review/${id}`)}
                    universityId={params.id}
                  />
                ) : (
                  <div className="text-center py-10 text-muted-foreground text-sm p-4">
                    <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-30" />
                    <p>No past sessions yet.</p>
                    <p className="mt-1">Start a test to see your history here.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Sidebar (Admissions & Missions) ── */}
          <div className="lg:col-span-5 space-y-6">
            <ExamPreparedness sessions={pastSessions} />
            <DailyMissionsTracker sessions={pastSessions} universityId={params.id} />
          </div>
        </div>
      </div>
    </Layout>
  );
}
