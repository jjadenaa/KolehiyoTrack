import { TOPIC_GROUPS, ALL_TOPICS_VALUE } from "./subjectConstants";

export interface SubjectItem {
  id: string;
  label: string;
}

export function buildAIPromptForUniversity(
  universityId: string,
  availableSubjects: SubjectItem[],
  selectedSubjects: Record<string, boolean>,
  itemCounts: Record<string, number>,
  selectedTopics: Record<string, string[]> = {}
): string {
  const selected = availableSubjects.filter((s) => selectedSubjects[s.id]);
  if (selected.length === 0) {
    return "Select at least one subject above to generate a prompt.";
  }

  const quizName = universityId.toUpperCase();
  const parts: string[] = [];
  parts.push(`You are an expert ${quizName} question writer.`);
  parts.push("");
  parts.push("STRICT REQUIREMENTS:");
  parts.push("- Each question must only have exactly 4 choices: A, B, C, D.");
  parts.push(" Do not rush in generating question always triple check to fit the requirements of the callibrations. Remake questions that has error or does not meet the qualifications in these calibrations stated.");
  parts.push("- Do not reuse or rephrase your questions — generate entirely new questions each time do not just translate english quizzes to filipino and vice versa..");
  parts.push("- Exactly ONE choice is correct no other possible answers in the choices must be generated.");
  parts.push("- Include a clear, educational explanation for the correct answer (2-4 sentences). For math formulas, equations, or step-by-step calculations, format them using KaTeX LaTeX notation (e.g., $12 \\times 5 = 60$, $$\\text{height}^2 + 12^2 = 13^2$$, \\frac{a}{b}, \\sqrt{x}).");
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
  parts.push(`    "diagram": { "shape": "rightTriangle", "vertices": ["A","B","C"], "sides": {"AB":"5","BC":"12","AC":"?"}, "angles": {"B":"30°"}, "show": ["vertices","sides","angles","rightAngleMark"] }  // ONLY include if the question has a geometric shape`);
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
  parts.push(`DIAGRAM: { "shape": "rightTriangle", "vertices": ["A","B","C"], "sides": {"AB":"5","BC":"12","AC":"?"}, "angles": {"B":"30°"}, "show": ["vertices","sides","angles","rightAngleMark"] }  // ONLY include if the question has a geometric shape`);
  parts.push("");
  parts.push("Subject values: " + availableSubjects.map((s) => s.id).join(" | "));
  parts.push("");

  for (const subject of selected) {
    const count = itemCounts[subject.id] || 10;
    const topics = selectedTopics[subject.id] ?? [ALL_TOPICS_VALUE];
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
      parts.push(`[${quizName} READING COMPREHENSION CALIBRATION]`);
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
      parts.push("- If a passage involves data or a table, represent it using standard Markdown table format with pipe separators (e.g. | Header 1 | Header 2 |\n|---|---|).");
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
      parts.push("SUBJECT: READING " + (subject.id === "reading_english" ? "ENGLISH" : "FILIPINO"));
      parts.push("PASSAGE:");
      parts.push("[Insert the full passage text here only once]");
      parts.push("");
      parts.push("ID: 1");
      parts.push("QUESTION: [Question 1 text]");
      parts.push("A) [Choice A]");
      parts.push("B) [Choice B]");
      parts.push("C) [Choice C]");
      parts.push("D) [Choice D]");
      parts.push("CORRECT: [A, B, C, or D]");
      parts.push("EXPLANATION: [Explanation for the answer]");
      parts.push("");
      parts.push("ID: 2");
      parts.push("QUESTION: [Question 2 text]");
      parts.push("A) [Choice A]");
      parts.push("B) [Choice B]");
      parts.push("C) [Choice C]");
      parts.push("D) [Choice D]");
      parts.push("CORRECT: [A, B, C, or D]");
      parts.push("EXPLANATION: [Explanation for the answer]");
      parts.push("");
      parts.push("PASSAGE:");
      parts.push("[Insert the next passage text here]");
      parts.push("");
      parts.push("ID: 3");
      parts.push("QUESTION: [Question 3 text]");
      parts.push("A) [Choice A]");
      parts.push("B) [Choice B]");
      parts.push("C) [Choice C]");
      parts.push("D) [Choice D]");
      parts.push("CORRECT: [A, B, C, or D]");
      parts.push("EXPLANATION: [Explanation for the answer]");
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
      parts.push(`[${quizName} MATHEMATICS CALIBRATION]`);
      parts.push("- Focus on: Number systems, algebraic expressions, functions, linear/quadratic equations, geometry, trigonometry, and word problems (age,coins,variations, mixture, motion, investment).");
      parts.push("- Keep calculations realistic, clean, and quickly solvable on scratch paper without messy long-form arithmetic. Don't make the questions confusing, impossible, difficult. Make it simple and straightforward that we can solve mentally and with scratch papers without the use of calculators. PLEASE USE THE REFERENCE MOCK EXAM VIDEOS AND REVIEWER IMAGES TO MAKE QUESTIONS.");
      parts.push("- Use ONLY Unicode math symbols and inline text — NEVER use LaTeX markup like $\\frac{}{}$ or $\\sqrt{}$.");
      parts.push("- For fractions: use inline format like 3/5, a/b, or Unicode ½, ⅔.");
      parts.push("- For square roots: use √ symbol like √2, √(x+3).");
      parts.push("- For exponents: use Unicode superscripts like x², x³, 2ⁿ.");
      parts.push("- For multiplication: use × or implied (e.g., 2x + 3).");
      parts.push("- For pi: use π. For degrees: use °.");
      parts.push("- Question stems must be short, punchy, direct, and get straight to the point without dense blocks of unnecessary text.");
      parts.push(`Maintain 100% consistency with all official ${quizName} review pages and mock test resources provided across our training sessions`);
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
      parts.push("DIAGRAM RULES & FORMATTING:");
      parts.push("- \"shape\": exact shape name from the list above.");
      parts.push("- \"vertices\": letters in order around the shape (e.g. [\"A\", \"B\", \"C\"]).");
      parts.push("- \"sides\": use vertex-pair names matching vertices (e.g. {\"AB\":\"5\", \"BC\":\"12\", \"AC\":\"?\"}) or generic keys ({\"a\":\"5\", \"b\":\"12\"}).");
      parts.push("- Use \"?\" for any side or hypotenuse the student must calculate.");
      parts.push("- \"angles\": vertex letter as key, value with degree sign or symbol (e.g. {\"C\":\"30°\"} or {\"C\":\"θ\"}). Use numeric IDs for angles (e.g., \"1\", \"2\") when dealing with transversals.");
      parts.push("- \"show\": [\"vertices\", \"sides\", \"angles\", \"rightAngleMark\", \"heightDashed\"].");
      parts.push("- Internal Lines: Tell me if the shape needs a \"diagonal\", \"median\", or \"altitude\". For example, in a triangle, specify \"altitude to the hypotenuse\".");
      parts.push("- Zig-Zag / Multiple Transversals: For parallel line problems, specify if it is a single transversal or a \"zig-zag\" line (like an 'M' or 'Z' shape) between the parallel lines.");
      parts.push("- Point Intersections: If lines are concurrent (meeting at a single point), label that vertex \"O\" or \"P\".");
      parts.push("- Shaded Regions: Specify if the question asks for the \"shaded area\" or the \"unshaded area\" of composite figures (like a circle inside a square).");
      parts.push("- Expanded Topics to Include: Parallel Lines & Transversals, Trapezoid Properties (median, diagonals), Complex Circle Geometry (chords, secants, tangents), Similar Triangles, Inscribed Figures.");
      parts.push("- Do NOT wrap plain numbers or decimals in dollar signs like $$0.000045$$ — write them as plain text or standard $0.000045$.");
      parts.push("- If the question has no geometric shape, OMIT the \"diagram\" field / DIAGRAM: line entirely.");
      parts.push("");
    }

    if (subject.id === "science") {
      parts.push("");
      parts.push(`[${quizName} SCIENCE CALIBRATION]`);
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
      parts.push(`[${quizName} LANGUAGE PROFICIENCY CALIBRATION]`);
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
      parts.push("For all analogy items, do NOT make the choices close to each other. For example, if the target given is part-to-whole, only the single correct option can be a part-to-whole relationship. All other choices must utilize completely different logical dynamics so the correct answer is completely clean and distinct.");
      parts.push("4. Spelling  Present four lowercase options testing standard high-frequency trap configurations e.g., accommodate vs. accommodatee");
      parts.push("5. Sentence Completion  Use a clean, blank line _______ inside a concise sentence. Options A., B., C., D. underneath must be lowercase and focus on strict morphological or particle usage. Pay close attention to precise surface vs. object focus markers.");
      parts.push("6. NO FILLER: Output must be delivered directly with zero conversational prefaces, warnings, or commentary unless explicitly asked.");
      parts.push("Formatting Rule: Contextual instruction headers, prefaces, and question prompts are stylistically preserved for all standard question types to maintain the authentic exam format. However, for word-pairing and analogy questions only, all directives and relationship instructions are strictly removed from the item generation to prevent spoiling the testing pairings or analogy contexts; these items must start immediately with the raw word pair or stem.");
      parts.push("Grammar Authority: All standard grammar rules, morphological patterns, syntactical judgments, and phrase markers generated or checked by the system must adhere strictly to the definitive authority of the Komisyon sa Wikang Filipino (KWF) and Lope K. Santos's Balarila ng Wikang Pambansa. All question evaluations and explanations must discard flawed reviewer traps in favor of these official standard references");
      parts.push("**Reference Mock Exam Video 1:** https://youtu.be/ljfgWPLEaQA?si=NC3VKHDy92SBGe4m");
      parts.push("**Reference Mock Exam Video 2:** https://youtu.be/bpmvYAIpekM?si=pNRgjxYStZfABqBW");
      parts.push("STRICTLY FOLLOW THIS CALLIBRATION AND ALL CALLIBRATIONS HAVE TALKED ABOUT IN THE ENTIERY OF OUR CHAT");
      parts.push("");
    }

    if (subject.id === "numerical_ability") {
      parts.push("");
      parts.push(`[${quizName} NUMERICAL ABILITY CALIBRATION]`);
      parts.push("- Focus on rapid mental math, speed arithmetic, fractions/decimals/percentages, number series & sequence discovery, ratios/proportions, quantitative comparison, and real-world practical word problems.");
      parts.push("- Calculations must be clean, elegant, and directly solvable within 30-60 seconds without long-form tedious calculations or calculator use.");
      parts.push("- Include 4 choices (A, B, C, D) and a step-by-step solution using KaTeX LaTeX or clear inline math.");
      parts.push("");
    }

    if (subject.id === "statistics_research") {
      parts.push("");
      parts.push(`[${quizName} STATISTICS & RESEARCH / BUSINESS MATH CALIBRATION]`);
      parts.push("- Focus on: Measures of central tendency (mean, median, mode) and dispersion (range, variance, standard deviation), probability rules, permutations & combinations, normal distribution properties, data interpretation from tables/graphs, research methodology (independent/dependent variables, hypothesis testing, sampling), and business math (simple/compound interest, profit/loss, markups).");
      parts.push("- Keep problems realistic, conceptually rigorous, and directly applicable to college entrance test standards.");
      parts.push("");
    }

    if (subject.id === "logical_reasoning") {
      parts.push("");
      parts.push(`[${quizName} LOGICAL REASONING CALIBRATION]`);
      parts.push("- Focus on formal deductive logic, syllogisms (valid vs. invalid conclusions), analytical puzzles (seating arrangements, ordering, relational logic), Venn diagrams & set logic, and conditional if-then reasoning.");
      parts.push("- Ensure exactly ONE logically indisputable valid deduction or conclusion among the 4 choices.");
      parts.push("");
    }

    if (subject.id === "abstract_reasoning") {
      parts.push("");
      parts.push(`[${quizName} ABSTRACT REASONING / MENTAL ABILITY CALIBRATION]`);
      parts.push("- Focus on non-verbal pattern recognition, spatial orientation, figure series and matrices, rotation/reflection logic, rule identification, and figure analogies.");
      parts.push("- For text-based descriptions of abstract reasoning figures, provide a crystal-clear, structured description of the sequence/matrix elements.");
      parts.push("");
    }

    if (subject.id === "general_info") {
      parts.push("");
      parts.push(`[${quizName} ANALOGIES & GENERAL INFO CALIBRATION]`);
      parts.push("- Focus on advanced verbal analogies, Philippine history & government/civics, world history & geography, arts & Philippine literature, and notable current affairs.");
      parts.push("- Analogy items must have one distinct, unambiguous logical relationship with no competing distractors.");
      parts.push("");
    }

    parts.push("");
  }

  parts.push("For JSON subjects: return the complete JSON array with ALL questions. Make sure every question has a unique 'id' across the entire array.");
  parts.push("For Reading Comprehension: return all questions in the plain text format, keeping questions for the same passage grouped together.");
  parts.push("For plain text format: you may also include a DIAGRAM: line with a compact JSON object if the question has a shape.");

  return parts.join("\n");
}
