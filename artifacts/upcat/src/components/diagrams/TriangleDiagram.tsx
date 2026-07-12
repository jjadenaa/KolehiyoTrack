interface LabelProps {
  vertexLabels?: string[];
  sideLabels?: Record<string, string>;
  angleLabels?: Record<string, string>;
}

export function RightTriangleDiagram({
  a, b, c, vertexLabels = ["A", "B", "C"], sideLabels, angleLabels
}: { a: number; b: number; c: number } & LabelProps) {
  const scale = 120 / Math.max(a, b);
  const h = a * scale, w = b * scale;
  const pad = 30, x = pad + 20, y = pad + h;
  const [A, B, C] = vertexLabels;
  const sideA = sideLabels?.a ?? a;
  const sideB = sideLabels?.b ?? b;
  const sideC = sideLabels?.c; // only render if explicitly given in text
  const angleA = angleLabels?.[A];
  const angleB = angleLabels?.[B];
  return (
    <svg viewBox={`0 0 ${w + pad * 2 + 50} ${h + pad * 2 + 30}`} className="w-full max-w-[280px] h-auto mx-auto">
      <polygon points={`${x},${y} ${x + w},${y} ${x},${y - h}`} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-blue-500" />
      <rect x={x - 2} y={y - 14} width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500" />
      {/* Vertex labels */}
      <text x={x - 6} y={y - h - 6} textAnchor="end" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{A}</text>
      <text x={x - 6} y={y + 16} textAnchor="end" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{B}</text>
      <text x={x + w + 8} y={y + 16} textAnchor="start" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{C}</text>
      {/* Side labels */}
      <text x={x - 4} y={y - h / 2} textAnchor="end" fill="currentColor" fontSize="11" fontWeight="600" className="text-green-500">{sideA}</text>
      <text x={x + w / 2} y={y + 14} textAnchor="middle" fill="currentColor" fontSize="11" fontWeight="600" className="text-green-500">{sideB}</text>
      {sideC && <text x={x + w / 2 + 6} y={y - h / 2 - 6} textAnchor="start" fill="currentColor" fontSize="11" fontWeight="600" className="text-red-500">{sideC}</text>}
      {/* Angle labels if given */}
      {angleA && <text x={x + 18} y={y - h + 14} textAnchor="start" fill="currentColor" fontSize="11" fontWeight="700" className="text-purple-500">∠{A} = {angleA}°</text>}
      {angleB && <text x={x + 4} y={y - 16} textAnchor="start" fill="currentColor" fontSize="11" fontWeight="700" className="text-purple-500">∠{B} = {angleB}°</text>}
    </svg>
  );
}

export function IsoscelesTriangleDiagram({
  base, equal, vertexLabels = ["A", "B", "C"], sideLabels, angleLabels
}: { base: number; equal: number } & LabelProps) {
  const hh = Math.sqrt(equal * equal - (base / 2) * (base / 2));
  const scale = 120 / Math.max(base, hh);
  const bw = base * scale, h = hh * scale;
  const cx = 130, by = 160;
  const [A, B, C] = vertexLabels;
  const baseL = sideLabels?.base ?? base;
  const eqL = sideLabels?.equal ?? equal;
  return (
    <svg viewBox="0 0 260 185" className="w-full max-w-[280px] h-auto mx-auto">
      <polygon points={`${cx},${by - h} ${cx - bw / 2},${by} ${cx + bw / 2},${by}`} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-blue-500" />
      <line x1={cx} y1={by - h} x2={cx} y2={by} stroke="currentColor" strokeWidth="1.5" strokeDasharray="4,4" className="text-gray-400" />
      {/* Vertex labels */}
      <text x={cx} y={by - h - 8} textAnchor="middle" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{A}</text>
      <text x={cx - bw / 2 - 8} y={by + 16} textAnchor="end" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{B}</text>
      <text x={cx + bw / 2 + 8} y={by + 16} textAnchor="start" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{C}</text>
      {/* Side labels */}
      <text x={cx + 8} y={by - h / 2} textAnchor="start" fill="currentColor" fontSize="11" fontWeight="600" className="text-green-500">eq = {eqL}</text>
      <text x={cx} y={by + 14} textAnchor="middle" fill="currentColor" fontSize="11" fontWeight="600" className="text-red-500">base = {baseL}</text>
      {angleLabels?.[A] && <text x={cx + 4} y={by - h + 18} textAnchor="start" fill="currentColor" fontSize="10" fontWeight="700" className="text-purple-500">∠{A} = {angleLabels[A]}°</text>}
    </svg>
  );
}

export function EquilateralTriangleDiagram({
  side, vertexLabels = ["A", "B", "C"], sideLabels, angleLabels
}: { side: number } & LabelProps) {
  const h = (side * Math.sqrt(3)) / 2;
  const scale = 130 / Math.max(side, h);
  const s = side * scale, hh = h * scale;
  const cx = 130, by = 165;
  const [A, B, C] = vertexLabels;
  const sideL = sideLabels?.side ?? side;
  return (
    <svg viewBox="0 0 260 185" className="w-full max-w-[280px] h-auto mx-auto">
      <polygon points={`${cx},${by - hh} ${cx - s / 2},${by} ${cx + s / 2},${by}`} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-blue-500" />
      {/* Vertex labels */}
      <text x={cx} y={by - hh - 8} textAnchor="middle" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{A}</text>
      <text x={cx - s / 2 - 8} y={by + 16} textAnchor="end" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{B}</text>
      <text x={cx + s / 2 + 8} y={by + 16} textAnchor="start" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{C}</text>
      {/* Side labels */}
      <text x={cx} y={by + 14} textAnchor="middle" fill="currentColor" fontSize="11" fontWeight="600" className="text-green-500">s = {sideL}</text>
      <text x={cx - s / 2 - 6} y={by - hh / 2 + 4} textAnchor="end" fill="currentColor" fontSize="11" fontWeight="600" className="text-green-500">s = {sideL}</text>
      <text x={cx + s / 2 + 6} y={by - hh / 2 + 4} textAnchor="start" fill="currentColor" fontSize="11" fontWeight="600" className="text-green-500">s = {sideL}</text>
      {angleLabels?.[A] && <text x={cx + 4} y={by - hh + 18} textAnchor="start" fill="currentColor" fontSize="10" fontWeight="700" className="text-purple-500">∠{A} = {angleLabels[A]}°</text>}
    </svg>
  );
}

export function ScaleneTriangleDiagram({
  a, b, c, vertexLabels = ["A", "B", "C"], sideLabels, angleLabels
}: { a: number; b: number; c: number } & LabelProps) {
  // Use Heron's formula for area, then compute a plausible SVG layout
  const s = (a + b + c) / 2;
  const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
  // Place B at origin, C on x-axis, A somewhere above
  const scale = 100 / Math.max(a, b, c);
  const aa = a * scale, bb = b * scale, cc = c * scale;
  const x = 40, y = 140;
  // B at (x,y), C at (x+cc, y) since side BC = c, A at computed position
  const bx = x, by = y;
  const cx = x + cc, cy = y;
  // Use law of cosines for angle at B: cos(B) = (a² + c² - b²) / (2ac)
  const cosB = (aa * aa + cc * cc - bb * bb) / (2 * aa * cc);
  const sinB = Math.sqrt(Math.max(0, 1 - cosB * cosB));
  const ax = bx + aa * cosB;
  const ay = by - aa * sinB;
  const [A, B, C] = vertexLabels;
  const sideA = sideLabels?.a ?? a;
  const sideB = sideLabels?.b ?? b;
  const sideC = sideLabels?.c ?? c;
  return (
    <svg viewBox="0 0 260 160" className="w-full max-w-[280px] h-auto mx-auto">
      <polygon points={`${ax},${ay} ${bx},${by} ${cx},${cy}`} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-blue-500" />
      {/* Vertex labels */}
      <text x={ax} y={ay - 8} textAnchor="middle" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{A}</text>
      <text x={bx - 8} y={by + 16} textAnchor="end" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{B}</text>
      <text x={cx + 8} y={cy + 16} textAnchor="start" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{C}</text>
      {/* Side labels near midpoints */}
      <text x={(ax + bx) / 2 - 18} y={(ay + by) / 2} textAnchor="end" fill="currentColor" fontSize="11" fontWeight="600" className="text-green-500">{sideA}</text>
      <text x={(bx + cx) / 2} y={by + 14} textAnchor="middle" fill="currentColor" fontSize="11" fontWeight="600" className="text-red-500">{sideC}</text>
      <text x={(ax + cx) / 2 + 10} y={(ay + cy) / 2} textAnchor="start" fill="currentColor" fontSize="11" fontWeight="600" className="text-green-500">{sideB}</text>
      {angleLabels?.[A] && <text x={ax + 4} y={ay + 14} textAnchor="start" fill="currentColor" fontSize="10" fontWeight="700" className="text-purple-500">∠{A} = {angleLabels[A]}°</text>}
      {angleLabels?.[B] && <text x={bx + 6} y={by - 8} textAnchor="start" fill="currentColor" fontSize="10" fontWeight="700" className="text-purple-500">∠{B} = {angleLabels[B]}°</text>}
      {angleLabels?.[C] && <text x={cx - 4} y={cy - 8} textAnchor="end" fill="currentColor" fontSize="10" fontWeight="700" className="text-purple-500">∠{C} = {angleLabels[C]}°</text>}
    </svg>
  );
}
