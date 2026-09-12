export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export const SUBJECT_LABELS: Record<string, string> = {
  language_english: "Language Proficiency (English)",
  language_filipino: "Language Proficiency (Filipino)",
  math: "Mathematics",
  science: "Science",
  reading_english: "Reading Comprehension (English)",
  reading_filipino: "Reading Comprehension (Filipino)",
  numerical_ability: "Numerical Ability",
  statistics_research: "Statistics & Research",
  logical_reasoning: "Logical Reasoning",
  abstract_reasoning: "Abstract Reasoning / Mental Ability",
  general_info: "Analogies & General Info",
};

// Seconds per item per subject type for UPCAT
export const SECONDS_PER_ITEM_UPCAT: Record<string, number> = {
  language_english: 22,
  language_filipino: 22,
  math: 60,
  science: 40,
  reading_english: 45,
  reading_filipino: 45,
  numerical_ability: 50,
  statistics_research: 60,
  logical_reasoning: 30,
  abstract_reasoning: 30,
  general_info: 30,
};

// Seconds per item per subject type for BUCET
export const SECONDS_PER_ITEM_BU: Record<string, number> = {
  language_english: 60,
  language_filipino: 60,
  math: 66,
  science: 45,
  reading_english: 60,
  reading_filipino: 60,
  numerical_ability: 60,
  statistics_research: 60,
  logical_reasoning: 40,
  abstract_reasoning: 40,
  general_info: 30,
};

// Seconds per item for Ateneo (ACET)
// Language: 100 items / 50m (30s)
// Reading: 30 items / 20m (40s)
// Math: 60 items / 60m (60s)
// Numerical Ability: 25 items / 25m (60s)
// Logical Reasoning: 25 items / 10m (24s)
// Abstract Reasoning: 30 items / 5m (10s)
// Analogies & General Info: 25 items / 5m (12s)
export const SECONDS_PER_ITEM_ATENEO: Record<string, number> = {
  language_english: 30,
  language_filipino: 30,
  reading_english: 40,
  reading_filipino: 40,
  math: 60,
  numerical_ability: 60,
  logical_reasoning: 24,
  abstract_reasoning: 10,
  general_info: 12,
  science: 45,
  statistics_research: 60,
};

// Seconds per item for DLSU (DCAT)
// Reasoning: 30 items / 30m (60s)
// English: 40 items / 40m (60s)
// Reading Comprehension: 40 items / 30m (45s)
// Statistics: 45 items / 40m (~53s)
// Mathematics: 45 items / 50m (~67s)
// Science: 50 items / 50m (60s)
export const SECONDS_PER_ITEM_DLSU: Record<string, number> = {
  abstract_reasoning: 60,
  language_english: 60,
  reading_english: 45,
  statistics_research: 53,
  math: 67,
  science: 60,
  language_filipino: 60,
  reading_filipino: 45,
  logical_reasoning: 60,
  numerical_ability: 67,
  general_info: 30,
};

// Seconds per item for UST (USTET 2027)
// Mental Ability: 60 items / 45m (45s)
// Language Proficiency: 80 items / 60m (45s)
// Mathematics: 60 items / 60m (60s)
// Science: 80 items / 60m (45s)
export const SECONDS_PER_ITEM_UST: Record<string, number> = {
  abstract_reasoning: 45,
  language_english: 45,
  math: 60,
  science: 45,
  reading_english: 45,
  language_filipino: 45,
  reading_filipino: 45,
  statistics_research: 60,
  logical_reasoning: 45,
  numerical_ability: 60,
  general_info: 30,
};

export function getSecondsPerItem(subject: string, universityId: string = "upcat"): number {
  const uni = (universityId || "").toLowerCase();
  let perItemMap = SECONDS_PER_ITEM_UPCAT;
  if (uni === "bu" || uni === "bucet") perItemMap = SECONDS_PER_ITEM_BU;
  else if (uni === "ateneo" || uni === "admu" || uni === "acet") perItemMap = SECONDS_PER_ITEM_ATENEO;
  else if (uni === "dlsu" || uni === "dcat") perItemMap = SECONDS_PER_ITEM_DLSU;
  else if (uni === "ust" || uni === "ustet") perItemMap = SECONDS_PER_ITEM_UST;

  return perItemMap[subject] ?? 60;
}

export function calcTotalSeconds(
  selectedSubjects: Record<string, boolean>,
  itemCounts: Record<string, number>,
  universityId: string = "upcat"
): number {
  const uni = (universityId || "").toLowerCase();

  // For DLSU / DCAT exact section durations specified in official test breakdowns
  if (uni === "dlsu" || uni === "dcat") {
    // Exact section duration in minutes for default item counts:
    // Reasoning: 30 items -> 30 mins (1800s)
    // English: 40 items -> 40 mins (2400s)
    // Reading Comprehension: 40 items -> 30 mins (1800s)
    // Statistics: 45 items -> 40 mins (2400s)
    // Mathematics: 45 items -> 50 mins (3000s)
    // Science: 50 items -> 50 mins (3000s)
    const exactSectionSeconds: Record<string, { defaultItems: number; defaultSecs: number }> = {
      abstract_reasoning: { defaultItems: 30, defaultSecs: 30 * 60 },
      language_english: { defaultItems: 40, defaultSecs: 40 * 60 },
      reading_english: { defaultItems: 40, defaultSecs: 30 * 60 },
      statistics_research: { defaultItems: 45, defaultSecs: 40 * 60 },
      math: { defaultItems: 45, defaultSecs: 50 * 60 },
      science: { defaultItems: 50, defaultSecs: 50 * 60 },
    };

    return Object.entries(selectedSubjects)
      .filter(([, selected]) => selected)
      .reduce((total, [subj]) => {
        const count = itemCounts[subj] || 0;
        const exact = exactSectionSeconds[subj];
        if (exact && count === exact.defaultItems) {
          return total + exact.defaultSecs;
        }
        const secs = SECONDS_PER_ITEM_DLSU[subj] ?? 60;
        return total + count * secs;
      }, 0);
  }

  // For UST / USTET exact section durations specified in official test breakdowns
  if (uni === "ust" || uni === "ustet") {
    // Mental Ability: 60 items -> 45 mins (2700s)
    // Language Proficiency: 80 items -> 60 mins (3600s)
    // Mathematics: 60 items -> 60 mins (3600s)
    // Science: 80 items -> 60 mins (3600s)
    const exactSectionSeconds: Record<string, { defaultItems: number; defaultSecs: number }> = {
      abstract_reasoning: { defaultItems: 60, defaultSecs: 45 * 60 },
      language_english: { defaultItems: 80, defaultSecs: 60 * 60 },
      math: { defaultItems: 60, defaultSecs: 60 * 60 },
      science: { defaultItems: 80, defaultSecs: 60 * 60 },
    };

    return Object.entries(selectedSubjects)
      .filter(([, selected]) => selected)
      .reduce((total, [subj]) => {
        const count = itemCounts[subj] || 0;
        const exact = exactSectionSeconds[subj];
        if (exact && count === exact.defaultItems) {
          return total + exact.defaultSecs;
        }
        const secs = SECONDS_PER_ITEM_UST[subj] ?? 45;
        return total + count * secs;
      }, 0);
  }

  let perItemMap = SECONDS_PER_ITEM_UPCAT;
  if (uni === "bu" || uni === "bucet") perItemMap = SECONDS_PER_ITEM_BU;
  else if (uni === "ateneo" || uni === "admu" || uni === "acet") perItemMap = SECONDS_PER_ITEM_ATENEO;

  return Object.entries(selectedSubjects)
    .filter(([, selected]) => selected)
    .reduce((total, [subj]) => {
      const secs = perItemMap[subj] ?? 60;
      return total + (itemCounts[subj] || 0) * secs;
    }, 0);
}

export function getAvailableSubjectsForUniversity(uniId: string): { id: string; label: string }[] {
  const uni = (uniId || "").toLowerCase();
  if (uni === "ateneo" || uni === "admu" || uni === "acet") {
    return [
      { id: "language_english", label: "Language Proficiency" },
      { id: "reading_english", label: "Reading Comprehension" },
      { id: "math", label: "Mathematics Proficiency" },
      { id: "numerical_ability", label: "Numerical Ability" },
      { id: "logical_reasoning", label: "Logical Reasoning" },
      { id: "abstract_reasoning", label: "Abstract Reasoning" },
      { id: "general_info", label: "Analogies & General Info" },
    ];
  }
  if (uni === "dlsu" || uni === "dcat") {
    return [
      { id: "abstract_reasoning", label: "Reasoning" },
      { id: "language_english", label: "English" },
      { id: "reading_english", label: "Reading Comprehension" },
      { id: "statistics_research", label: "Statistics" },
      { id: "math", label: "Mathematics" },
      { id: "science", label: "Science" },
    ];
  }
  if (uni === "ust" || uni === "ustet") {
    return [
      { id: "abstract_reasoning", label: "Mental Ability" },
      { id: "language_english", label: "Language Proficiency" },
      { id: "math", label: "Mathematics" },
      { id: "science", label: "Science" },
    ];
  }
  if (uni === "bu" || uni === "bucet") {
    return [
      { id: "language_english", label: "Language Proficiency (English)" },
      { id: "language_filipino", label: "Language Proficiency (Filipino)" },
      { id: "math", label: "Mathematics" },
      { id: "science", label: "Science" },
      { id: "reading_english", label: "Reading Comprehension (English)" },
      { id: "reading_filipino", label: "Reading Comprehension (Filipino)" },
    ];
  }
  // Standard UPCAT subjects
  return [
    { id: "language_english", label: "Language Proficiency (English)" },
    { id: "language_filipino", label: "Language Proficiency (Filipino)" },
    { id: "math", label: "Mathematics" },
    { id: "science", label: "Science" },
    { id: "reading_english", label: "Reading Comprehension (English)" },
    { id: "reading_filipino", label: "Reading Comprehension (Filipino)" },
  ];
}

export function getDefaultItemCounts(uniId: string): Record<string, number> {
  const uni = (uniId || "").toLowerCase();
  if (uni === "ateneo" || uni === "admu" || uni === "acet") {
    return {
      language_english: 100,
      reading_english: 30,
      math: 60,
      numerical_ability: 25,
      logical_reasoning: 25,
      abstract_reasoning: 30,
      general_info: 25,
    };
  }
  if (uni === "dlsu" || uni === "dcat") {
    return {
      abstract_reasoning: 30,
      language_english: 40,
      reading_english: 40,
      statistics_research: 45,
      math: 45,
      science: 50,
    };
  }
  if (uni === "ust" || uni === "ustet") {
    return {
      abstract_reasoning: 60,
      language_english: 80,
      math: 60,
      science: 80,
    };
  }
  if (uni === "bu" || uni === "bucet") {
    return {
      language_english: 30,
      language_filipino: 30,
      math: 50,
      science: 60,
      reading_english: 30,
      reading_filipino: 30,
    };
  }
  // Standard UPCAT
  return {
    language_english: 40,
    language_filipino: 40,
    math: 60,
    science: 60,
    reading_english: 40,
    reading_filipino: 40,
  };
}

