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
// Math Proficiency: ~50 items / 50m (60s)
// Statistics & Research: ~40 items / 50m (75s)
// Science Subtest: ~45 items / 35m (~47s)
// Language Proficiency & EAPP: ~50 items / 35m (~42s)
// Reading Comprehension: ~30 items / 35m (~70s)
// Mental Ability / Abstract Reasoning: ~40 items / 25m (~38s)
export const SECONDS_PER_ITEM_DLSU: Record<string, number> = {
  math: 60,
  statistics_research: 75,
  science: 47,
  language_english: 42,
  reading_english: 70,
  language_filipino: 42,
  reading_filipino: 70,
  abstract_reasoning: 38,
  logical_reasoning: 38,
  numerical_ability: 60,
  general_info: 30,
};

export function getSecondsPerItem(subject: string, universityId: string = "upcat"): number {
  const uni = (universityId || "").toLowerCase();
  let perItemMap = SECONDS_PER_ITEM_UPCAT;
  if (uni === "bu" || uni === "bucet") perItemMap = SECONDS_PER_ITEM_BU;
  else if (uni === "ateneo" || uni === "admu" || uni === "acet") perItemMap = SECONDS_PER_ITEM_ATENEO;
  else if (uni === "dlsu" || uni === "dcat") perItemMap = SECONDS_PER_ITEM_DLSU;

  return perItemMap[subject] ?? 60;
}

export function calcTotalSeconds(
  selectedSubjects: Record<string, boolean>,
  itemCounts: Record<string, number>,
  universityId: string = "upcat"
): number {
  const uni = (universityId || "").toLowerCase();
  let perItemMap = SECONDS_PER_ITEM_UPCAT;
  if (uni === "bu" || uni === "bucet") perItemMap = SECONDS_PER_ITEM_BU;
  else if (uni === "ateneo" || uni === "admu" || uni === "acet") perItemMap = SECONDS_PER_ITEM_ATENEO;
  else if (uni === "dlsu" || uni === "dcat") perItemMap = SECONDS_PER_ITEM_DLSU;

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
      { id: "math", label: "Mathematics & Statistics" },
      { id: "statistics_research", label: "Statistics & Research" },
      { id: "science", label: "Science Subtest" },
      { id: "language_english", label: "Language Proficiency & EAPP" },
      { id: "reading_english", label: "Reading Comprehension" },
      { id: "abstract_reasoning", label: "Mental Ability / Abstract Reasoning" },
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
      math: 50,
      statistics_research: 40,
      science: 45,
      language_english: 50,
      reading_english: 30,
      abstract_reasoning: 40,
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

