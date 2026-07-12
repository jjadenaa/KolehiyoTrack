export interface DiagramMatch {
  type: string;
  params: Record<string, any>;
}

function extractNumbers(text: string): number[] {
  // Skip numbers preceded by "angle" or followed by "degree(s)" or "°"
  const matches = text.match(/\b(\d+(?:\.\d+)?)\b/g);
  if (!matches) return [];
  const result: number[] = [];
  for (const m of matches) {
    const n = Number(m);
    const idx = text.indexOf(m);
    const before = text.slice(Math.max(0, idx - 20), idx).toLowerCase();
    const after = text.slice(idx + m.length, idx + m.length + 15).toLowerCase();
    if (before.match(/\bangle\s*$/) || after.match(/^\s*\u00b0/) || after.match(/^\s*deg/)) continue;
    result.push(n);
  }
  return result;
}

function extractVertexLetters(text: string): string[] {
  const match = text.match(/\b(?:triangle|parallelogram|quadrilateral|rectangle|square|trapezoid|rhombus|kite)\s+([A-Z](?:,\s*[A-Z]|-[A-Z])*)\b/i);
  if (match) {
    const raw = match[1];
    return raw.replace(/[^A-Z]/gi, "").split("");
  }
  const vertexMatch = text.match(/(?:at\s+)?vertex\s+([A-Z])\b/i);
  if (vertexMatch) return [vertexMatch[1]];
  const sideMatch = text.match(/(?:side|segment)\s+([A-Z]{2})\b/i);
  if (sideMatch) return sideMatch[1].split("");
  return [];
}

function extractSideLabel(text: string, sideLetter: string): string | null {
  const regex = new RegExp(`(?:side|segment|edge|length of|leg|base|height|width)\s+${sideLetter}\s*(?:=|:)?\s*(\d+(?:\.\d+)?)`, "i");
  const match = text.match(regex);
  return match ? match[1] : null;
}

function extractAngleLabels(text: string): Record<string, string> {
  const labels: Record<string, string> = {};
  const patterns = [
    /(?:angle|measure of\s+(?:the\s+)?(?:interior\s+)?(?:exterior\s+)?)([A-Z])\s*(?:=|:)?\s*(\d+(?:\.\d+)?)/gi,
    /(?:\u2220|angle\s*)([A-Z])\s*(?:=|:)?\s*(\d+(?:\.\d+)?)/gi,
    /(?:\u2220|angle\s*)([A-Z][A-Z])\s*(?:=|:)?\s*(\d+(?:\.\d+)?)/gi,
  ];
  for (const pattern of patterns) {
    let m;
    while ((m = pattern.exec(text)) !== null) {
      labels[m[1]] = m[2];
    }
  }
  return labels;
}

export function matchDiagram(text: string): DiagramMatch | null {
  const t = text.toLowerCase();
  const nums = extractNumbers(text);
  const letters = extractVertexLetters(text);
  const angleLabels = extractAngleLabels(text);
  const angleCount = Object.keys(angleLabels).length;

  // ─── Circle ───
  if (/\bcircle\b/.test(t) || /\bradius\b/.test(t) || /\bdiameter\b/.test(t) || /\bcircumference\b/.test(t)) {
    if (nums.length === 0) return null;
    const r = nums.find((n) => n > 0 && n < 1000) ?? 5;
    const d = nums.find((n) => n > 0 && n > r) ?? undefined;
    return { type: "circle", params: { radius: r, diameter: d, centerLabel: letters[0] || "O" } };
  }

  // ─── Parallel Lines with Transversal ───
  if (/\bparallel\s*lines?\b/.test(t) || /\btransversal\b/.test(t) || /\bcorresponding\s*angles?\b/.test(t) || /\balternate\s*(?:interior|exterior)\s*angles?\b/.test(t)) {
    const deg1 = angleLabels[Object.keys(angleLabels)[0]] ? Number(angleLabels[Object.keys(angleLabels)[0]]) : undefined;
    const deg2 = angleLabels[Object.keys(angleLabels)[1]] ? Number(angleLabels[Object.keys(angleLabels)[1]]) : undefined;
    return { type: "parallelLines", params: { angle1: deg1, angle2: deg2, angleLabels } };
  }

  // ─── Similar Triangles ───
  if (/\bsimilar\s*triangles?\b/.test(t) || /\bproportional\s*triangles?\b/.test(t)) {
    if (nums.length === 0) return null;
    return { type: "similarTriangles", params: { ratio: nums[0] || nums[1] || 2, vertexLabels: letters.slice(0, 6) } };
  }

  // ─── Right Triangle ───
  if (/\b(?:angle|elevation|depression)\b/.test(t) && /\b(?:degree|degrees|\d+\s*m|meter|m\b)/.test(text)) {
    const deg = extractAngleLabels(text);
    const angleVal = Object.values(deg)[0] ? Number(Object.values(deg)[0]) : undefined;
    const dist = nums.find((n) => n > 0) ?? undefined;
    if (!dist && !angleVal) return null;
    return { type: "rightTriangle", params: { a: dist, b: dist, c: undefined, angle: angleVal, vertexLabels: letters.slice(0, 3) || ["A", "B", "C"], sideLabels: dist ? { a: String(dist), b: String(dist) } : {}, angleLabels: angleVal ? { ...(letters[0] && { [letters[0]]: String(angleVal) }) } : {} } };
  }
  if (/\bright\s*triangle\b/.test(t) || /\bhypotenuse\b/.test(t) || /\bsohcahtoa\b/.test(t) || /\bpythagorean\b/.test(t)) {
    // Need at least 2 measurements (sides or angles) to be confident
    const totalMeasures = nums.length + angleCount;
    if (totalMeasures < 1) return null;
    const a = extractSideLabel(text, "a") || (nums[0] !== undefined ? String(nums[0]) : undefined);
    const b = extractSideLabel(text, "b") || (nums[1] !== undefined ? String(nums[1]) : undefined);
    const c = extractSideLabel(text, "c") || (nums[2] !== undefined ? String(nums[2]) : undefined);
    const sideLabels: Record<string, string> = {};
    if (a) sideLabels.a = a;
    if (b) sideLabels.b = b;
    if (c) sideLabels.c = c;
    return { type: "rightTriangle", params: { a: Number(a) || 3, b: Number(b) || 4, c: c ? Number(c) : undefined, vertexLabels: letters.slice(0, 3) || ["A", "B", "C"], sideLabels, angleLabels } };
  }

  // ─── Isosceles Triangle ───
  if (/\bisosceles\s*triangle\b/.test(t)) {
    if (nums.length < 1) return null;
    const base = nums[0] ?? undefined;
    const equal = nums[1] ?? undefined;
    const sideLabels: Record<string, string> = {};
    if (base !== undefined) sideLabels.base = extractSideLabel(text, "base") || String(base);
    if (equal !== undefined) sideLabels.equal = extractSideLabel(text, "equal") || String(equal);
    return { type: "isoscelesTriangle", params: { base: base || 6, equal: equal || 5, vertexLabels: letters.slice(0, 3) || ["A", "B", "C"], sideLabels, angleLabels } };
  }

  // ─── Equilateral Triangle ───
  if (/\bequilateral\s*triangle\b/.test(t)) {
    if (nums.length === 0) return null;
    const side = nums.find((n) => n > 0) ?? 5;
    return { type: "equilateralTriangle", params: { side, vertexLabels: letters.slice(0, 3) || ["A", "B", "C"], sideLabels: { side: extractSideLabel(text, "side") || String(side) }, angleLabels } };
  }

  // ─── Scalene / Obtuse / Acute / Generic Triangle ───
  if (/\b(?:scalene|obtuse|acute)\s*triangle\b/.test(t) || (/\btriangle\b/.test(t) && letters.length >= 3)) {
    // Need at least 3 side lengths to draw a specific scalene triangle
    if (nums.length < 3) return null;
    const [a, b, c] = [nums[0], nums[1], nums[2]];
    const sideLabels: Record<string, string> = {};
    if (a !== undefined) sideLabels.a = extractSideLabel(text, "a") || String(a);
    if (b !== undefined) sideLabels.b = extractSideLabel(text, "b") || String(b);
    if (c !== undefined) sideLabels.c = extractSideLabel(text, "c") || String(c);
    return { type: "scaleneTriangle", params: { a, b, c, vertexLabels: letters.slice(0, 3) || ["A", "B", "C"], sideLabels, angleLabels } };
  }

  // ─── Square ───
  if (/\bsquare\b/.test(t) && !/\bsquare\s*root\b/.test(t)) {
    if (nums.length === 0) return null;
    const side = nums.find((n) => n > 0) ?? 5;
    return { type: "square", params: { side, vertexLabels: letters.slice(0, 4) || ["A", "B", "C", "D"], sideLabels: { side: extractSideLabel(text, "side") || String(side) }, angleLabels } };
  }

  // ─── Rectangle ───
  if (/\brectangle\b/.test(t) || (/\blength\b/.test(t) && /\bwidth\b/.test(t) && /\bquadrilateral\b/.test(t))) {
    if (nums.length < 1) return null;
    const w = nums[0] ?? undefined;
    const h = nums[1] ?? undefined;
    const sideLabels: Record<string, string> = {};
    if (w !== undefined) sideLabels.width = extractSideLabel(text, "width") || String(w);
    if (h !== undefined) sideLabels.height = extractSideLabel(text, "height") || String(h);
    return { type: "rectangle", params: { width: w || 6, height: h || 4, vertexLabels: letters.slice(0, 4) || ["A", "B", "C", "D"], sideLabels, angleLabels } };
  }

  // ─── Parallelogram ───
  if (/\bparallelogram\b/.test(t)) {
    if (nums.length < 1) return null;
    const base = nums[0] ?? undefined;
    const side = nums[1] ?? undefined;
    const sideLabels: Record<string, string> = {};
    if (base !== undefined) sideLabels.base = extractSideLabel(text, "base") || String(base);
    if (side !== undefined) sideLabels.side = extractSideLabel(text, "side") || String(side);
    return { type: "parallelogram", params: { base: base || 6, side: side || 4, vertexLabels: letters.slice(0, 4) || ["A", "B", "C", "D"], sideLabels, angleLabels } };
  }

  // ─── Trapezoid / Trapezium ───
  if (/\bisosceles\s*trapezoid\b/.test(t) || /\bisosceles\s*trapezium\b/.test(t)) {
    if (nums.length < 1) return null;
    const top = nums[0] ?? undefined;
    const bottom = nums[1] ?? undefined;
    const height = nums[2] ?? undefined;
    const sideLabels: Record<string, string> = {};
    if (top !== undefined) sideLabels.top = String(top);
    if (bottom !== undefined) sideLabels.bottom = String(bottom);
    if (height !== undefined) sideLabels.height = String(height);
    return { type: "isoscelesTrapezoid", params: { top: top || 4, bottom: bottom || 8, height: height || 3, vertexLabels: letters.slice(0, 4) || ["A", "B", "C", "D"], sideLabels, angleLabels } };
  }
  if (/\btrapezoid\b/.test(t) || /\btrapezium\b/.test(t)) {
    if (nums.length < 1) return null;
    const top = nums[0] ?? undefined;
    const bottom = nums[1] ?? undefined;
    const height = nums[2] ?? undefined;
    const sideLabels: Record<string, string> = {};
    if (top !== undefined) sideLabels.top = String(top);
    if (bottom !== undefined) sideLabels.bottom = String(bottom);
    if (height !== undefined) sideLabels.height = String(height);
    return { type: "trapezoid", params: { top: top || 4, bottom: bottom || 8, height: height || 3, vertexLabels: letters.slice(0, 4) || ["A", "B", "C", "D"], sideLabels, angleLabels } };
  }

  // ─── Rhombus / Diamond ───
  if (/\brhombus\b/.test(t) || /\bdiamond\s*shape\b/.test(t)) {
    if (nums.length === 0) return null;
    const side = nums.find((n) => n > 0) ?? 5;
    return { type: "rhombus", params: { side, vertexLabels: letters.slice(0, 4) || ["A", "B", "C", "D"], sideLabels: { side: extractSideLabel(text, "side") || String(side) }, angleLabels } };
  }

  // ─── Kite ───
  if (/\bkite\b/.test(t) && !/\bkites?\s*(?:flying|surfing|board)\b/.test(t)) {
    if (nums.length < 1) return null;
    const a = nums[0] ?? undefined;
    const b = nums[1] ?? undefined;
    const sideLabels: Record<string, string> = {};
    if (a !== undefined) sideLabels.a = String(a);
    if (b !== undefined) sideLabels.b = String(b);
    return { type: "kite", params: { sideA: a || 5, sideB: b || 4, vertexLabels: letters.slice(0, 4) || ["A", "B", "C", "D"], sideLabels, angleLabels } };
  }

  // ─── Regular Polygons ───
  if (/\bheptagon\b/.test(t) || /\bseptagon\b/.test(t)) {
    if (nums.length === 0) return null;
    const side = nums.find((n) => n > 0) ?? 4;
    return { type: "polygon", params: { sides: 7, side, vertexLabels: letters.slice(0, 7) } };
  }
  if (/\bpentagon\b/.test(t)) {
    if (nums.length === 0) return null;
    const side = nums.find((n) => n > 0) ?? 4;
    return { type: "polygon", params: { sides: 5, side, vertexLabels: letters.slice(0, 5) } };
  }
  if (/\bhexagon\b/.test(t)) {
    if (nums.length === 0) return null;
    const side = nums.find((n) => n > 0) ?? 4;
    return { type: "polygon", params: { sides: 6, side, vertexLabels: letters.slice(0, 6) } };
  }
  if (/\boctagon\b/.test(t)) {
    if (nums.length === 0) return null;
    const side = nums.find((n) => n > 0) ?? 4;
    return { type: "polygon", params: { sides: 8, side, vertexLabels: letters.slice(0, 8) } };
  }

  // ─── Angle ───
  // Reject temperature degrees (°C / °F / °K) — only match geometric angles
  const angleMatch = t.match(/(\d+)\s*\u00b0(?!\s*[CFKcfk])/);
  if (angleMatch || /\bangle\b/.test(t)) {
    const deg = angleMatch ? Number(angleMatch[1]) : undefined;
    if (!deg) return null;
    return { type: "angle", params: { degrees: deg, vertexLabels: letters.slice(0, 1), angleLabels } };
  }

  // ─── Number Line ───
  if (/\bnumber\s*line\b/.test(t)) {
    if (nums.length === 0) return null;
    const center = nums[0] ?? 0;
    return { type: "numberLine", params: { center } };
  }

  // ─── Bar Chart ───
  if (/\bbar\s*(?:chart|graph)\b/.test(t) || /\bfrequency\b/.test(t) || /\bdata\s*table\b/.test(t)) {
    if (nums.length < 2) return null;
    const values = nums;
    return { type: "barChart", params: { values } };
  }

  return null;
}
