export const ALL_TOPICS_VALUE = "__all__";

export const TOPIC_GROUPS: Record<string, { label: string; options: { value: string; label: string }[] }[]> = {
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
  numerical_ability: [
    {
      label: "Numerical Ability",
      options: [
        { value: "arithmetic_operations", label: "Arithmetic Operations & Fractions/Decimals" },
        { value: "number_series", label: "Number Series & Numerical Sequences" },
        { value: "quantitative_comparison", label: "Quantitative Comparison & Estimation" },
        { value: "mental_math", label: "Mental Math & Fast Calculations" },
      ],
    },
  ],
  statistics_research: [
    {
      label: "Statistics & Research",
      options: [
        { value: "measures_central_tendency", label: "Measures of Central Tendency & Dispersion" },
        { value: "probability_combinatorics", label: "Probability, Permutations & Combinations" },
        { value: "normal_distribution", label: "Normal Distribution & Data Interpretation" },
        { value: "research_methodology", label: "Research Methodology, Variables & Hypotheses" },
        { value: "business_math", label: "Business Math (Interest, Profit/Loss, Break-even)" },
      ],
    },
  ],
  logical_reasoning: [
    {
      label: "Logical Reasoning",
      options: [
        { value: "syllogisms_deductive", label: "Syllogisms & Deductive Reasoning" },
        { value: "analytical_puzzles", label: "Analytical Puzzles & Relational Logic" },
        { value: "conditional_logic", label: "Conditional Statements (If-Then Logic)" },
        { value: "venn_diagrams_sets", label: "Venn Diagrams & Set Logic" },
      ],
    },
  ],
  abstract_reasoning: [
    {
      label: "Abstract Reasoning",
      options: [
        { value: "spatial_patterns_matrices", label: "Spatial Patterns & Matrices" },
        { value: "figure_rotations_folding", label: "Figure Rotations & Paper Folding" },
        { value: "number_figure_series", label: "Number & Figure Series Progression" },
        { value: "rule_identification", label: "Non-Verbal Rule Identification" },
      ],
    },
  ],
  general_info: [
    {
      label: "Analogies & General Info",
      options: [
        { value: "advanced_analogies", label: "Advanced Verbal Analogies" },
        { value: "philippine_history_civics", label: "Philippine History, Civics & Constitution" },
        { value: "world_history_geography", label: "World History & Geography" },
      ],
    },
  ],
};
