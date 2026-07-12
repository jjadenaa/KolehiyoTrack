interface LabelProps {
  vertexLabels?: string[];
  sideLabels?: Record<string, string>;
  angleLabels?: Record<string, string>;
}

export function SquareDiagram({
  side, vertexLabels = ["A", "B", "C", "D"], sideLabels, angleLabels
}: { side: number } & LabelProps) {
  const s = 100, x = 60, y = 60;
  const [A, B, C, D] = vertexLabels;
  const sideL = sideLabels?.side ?? side;
  return (
    <svg viewBox="0 0 220 220" className="w-full max-w-[280px] h-auto mx-auto">
      <rect x={x} y={y} width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-blue-500" />
      {/* Vertex labels */}
      <text x={x - 6} y={y - 6} textAnchor="end" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{A}</text>
      <text x={x + s + 6} y={y - 6} textAnchor="start" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{B}</text>
      <text x={x + s + 6} y={y + s + 16} textAnchor="start" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{C}</text>
      <text x={x - 6} y={y + s + 16} textAnchor="end" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{D}</text>
      {/* Side labels */}
      <text x={x + s / 2} y={y - 10} textAnchor="middle" fill="currentColor" fontSize="11" fontWeight="600" className="text-green-500">s = {sideL}</text>
      <text x={x + s + 10} y={y + s / 2 + 4} textAnchor="start" fill="currentColor" fontSize="11" fontWeight="600" className="text-green-500">s = {sideL}</text>
      {angleLabels?.[A] && <text x={x + 8} y={y + 12} textAnchor="start" fill="currentColor" fontSize="10" fontWeight="700" className="text-purple-500">∠{A} = {angleLabels[A]}°</text>}
    </svg>
  );
}

export function RectangleDiagram({
  width, height, vertexLabels = ["A", "B", "C", "D"], sideLabels, angleLabels
}: { width: number; height: number } & LabelProps) {
  const w = 120, h = 80, x = 50, y = 70;
  const [A, B, C, D] = vertexLabels;
  const wL = sideLabels?.width ?? width;
  const hL = sideLabels?.height ?? height;
  return (
    <svg viewBox="0 0 220 220" className="w-full max-w-[280px] h-auto mx-auto">
      <rect x={x} y={y} width={w} height={h} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-blue-500" />
      {/* Vertex labels */}
      <text x={x - 6} y={y - 6} textAnchor="end" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{A}</text>
      <text x={x + w + 6} y={y - 6} textAnchor="start" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{B}</text>
      <text x={x + w + 6} y={y + h + 16} textAnchor="start" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{C}</text>
      <text x={x - 6} y={y + h + 16} textAnchor="end" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{D}</text>
      {/* Side labels */}
      <text x={x + w / 2} y={y - 10} textAnchor="middle" fill="currentColor" fontSize="11" fontWeight="600" className="text-green-500">w = {wL}</text>
      <text x={x + w + 10} y={y + h / 2 + 4} textAnchor="start" fill="currentColor" fontSize="11" fontWeight="600" className="text-red-500">h = {hL}</text>
      {angleLabels?.[A] && <text x={x + 8} y={y + 12} textAnchor="start" fill="currentColor" fontSize="10" fontWeight="700" className="text-purple-500">∠{A} = {angleLabels[A]}°</text>}
    </svg>
  );
}

export function ParallelogramDiagram({
  base, side, vertexLabels = ["A", "B", "C", "D"], sideLabels, angleLabels
}: { base: number; side: number } & LabelProps) {
  const b = 120, h = 80, skew = 30, x = 40, y = 80;
  const [A, B, C, D] = vertexLabels;
  const baseL = sideLabels?.base ?? base;
  const sideL = sideLabels?.side ?? side;
  return (
    <svg viewBox="0 0 220 220" className="w-full max-w-[280px] h-auto mx-auto">
      <polygon points={`${x + skew},${y} ${x + b + skew},${y} ${x + b},${y - h} ${x},${y - h}`} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-blue-500" />
      {/* Vertex labels */}
      <text x={x + skew - 6} y={y + 16} textAnchor="end" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{A}</text>
      <text x={x + b + skew + 6} y={y + 16} textAnchor="start" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{B}</text>
      <text x={x + b + 6} y={y - h - 6} textAnchor="start" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{C}</text>
      <text x={x - 6} y={y - h - 6} textAnchor="end" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{D}</text>
      {/* Side labels */}
      <text x={x + b / 2 + skew / 2} y={y + 18} textAnchor="middle" fill="currentColor" fontSize="11" fontWeight="600" className="text-green-500">base = {baseL}</text>
      <text x={x + b + skew + 8} y={y - h / 2 + 4} textAnchor="start" fill="currentColor" fontSize="11" fontWeight="600" className="text-red-500">side = {sideL}</text>
      {angleLabels?.[A] && <text x={x + skew + 8} y={y - 8} textAnchor="start" fill="currentColor" fontSize="10" fontWeight="700" className="text-purple-500">∠{A} = {angleLabels[A]}°</text>}
    </svg>
  );
}

export function TrapezoidDiagram({
  top, bottom, height, vertexLabels = ["A", "B", "C", "D"], sideLabels, angleLabels
}: { top: number; bottom: number; height: number } & LabelProps) {
  const b = 120, t = 60, h = 70, x = 50, y = 80;
  const offset = (b - t) / 2;
  const [A, B, C, D] = vertexLabels;
  const topL = sideLabels?.top ?? top;
  const botL = sideLabels?.bottom ?? bottom;
  const hL = sideLabels?.height ?? height;
  return (
    <svg viewBox="0 0 220 220" className="w-full max-w-[280px] h-auto mx-auto">
      <polygon points={`${x + offset},${y - h} ${x + offset + t},${y - h} ${x + b},${y} ${x},${y}`} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-blue-500" />
      <line x1={x + offset + t / 2} y1={y - h} x2={x + offset + t / 2} y2={y} stroke="currentColor" strokeWidth="1.5" strokeDasharray="4,4" className="text-gray-400" />
      {/* Vertex labels */}
      <text x={x + offset - 6} y={y - h - 6} textAnchor="end" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{A}</text>
      <text x={x + offset + t + 6} y={y - h - 6} textAnchor="start" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{B}</text>
      <text x={x + b + 6} y={y + 16} textAnchor="start" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{C}</text>
      <text x={x - 6} y={y + 16} textAnchor="end" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{D}</text>
      {/* Side labels */}
      <text x={x + offset + t / 2} y={y - h - 10} textAnchor="middle" fill="currentColor" fontSize="11" fontWeight="600" className="text-green-500">top = {topL}</text>
      <text x={x + b / 2} y={y + 18} textAnchor="middle" fill="currentColor" fontSize="11" fontWeight="600" className="text-red-500">base = {botL}</text>
      <text x={x + offset + t / 2 + 6} y={y - h / 2} textAnchor="start" fill="currentColor" fontSize="11" fontWeight="600" className="text-gray-400">h = {hL}</text>
      {angleLabels?.[A] && <text x={x + offset + 8} y={y - h + 14} textAnchor="start" fill="currentColor" fontSize="10" fontWeight="700" className="text-purple-500">∠{A} = {angleLabels[A]}°</text>}
    </svg>
  );
}

export function RhombusDiagram({
  side, vertexLabels = ["A", "B", "C", "D"], sideLabels, angleLabels
}: { side: number } & LabelProps) {
  const cx = 110, cy = 110, w = 80, h = 60;
  const [A, B, C, D] = vertexLabels;
  const sideL = sideLabels?.side ?? side;
  return (
    <svg viewBox="0 0 220 220" className="w-full max-w-[280px] h-auto mx-auto">
      <polygon points={`${cx},${cy - h} ${cx + w},${cy} ${cx},${cy + h} ${cx - w},${cy}`} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-blue-500" />
      {/* Vertex labels */}
      <text x={cx} y={cy - h - 8} textAnchor="middle" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{A}</text>
      <text x={cx + w + 6} y={cy - 4} textAnchor="start" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{B}</text>
      <text x={cx} y={cy + h + 16} textAnchor="middle" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{C}</text>
      <text x={cx - w - 6} y={cy + 4} textAnchor="end" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{D}</text>
      {/* Side label */}
      <text x={cx + w + 10} y={cy + 14} textAnchor="start" fill="currentColor" fontSize="11" fontWeight="600" className="text-green-500">s = {sideL}</text>
      {angleLabels?.[A] && <text x={cx + 4} y={cy - h + 14} textAnchor="start" fill="currentColor" fontSize="10" fontWeight="700" className="text-purple-500">∠{A} = {angleLabels[A]}°</text>}
    </svg>
  );
}

export function KiteDiagram({
  sideA, sideB, vertexLabels = ["A", "B", "C", "D"], sideLabels, angleLabels
}: { sideA: number; sideB: number } & LabelProps) {
  const cx = 110, cy = 110, w = 70, h1 = 50, h2 = 70;
  const [A, B, C, D] = vertexLabels;
  const aL = sideLabels?.a ?? sideA;
  const bL = sideLabels?.b ?? sideB;
  return (
    <svg viewBox="0 0 220 220" className="w-full max-w-[280px] h-auto mx-auto">
      <polygon points={`${cx},${cy - h1} ${cx + w},${cy} ${cx},${cy + h2} ${cx - w},${cy}`} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-blue-500" />
      {/* Diagonals */}
      <line x1={cx} y1={cy - h1} x2={cx} y2={cy + h2} stroke="currentColor" strokeWidth="1" strokeDasharray="3,3" className="text-gray-400" />
      <line x1={cx - w} y1={cy} x2={cx + w} y2={cy} stroke="currentColor" strokeWidth="1" strokeDasharray="3,3" className="text-gray-400" />
      {/* Vertex labels */}
      <text x={cx} y={cy - h1 - 8} textAnchor="middle" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{A}</text>
      <text x={cx + w + 6} y={cy + 4} textAnchor="start" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{B}</text>
      <text x={cx} y={cy + h2 + 16} textAnchor="middle" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{C}</text>
      <text x={cx - w - 6} y={cy + 4} textAnchor="end" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{D}</text>
      {/* Side labels */}
      <text x={cx + w / 2 + 6} y={cy - h1 / 2 - 4} textAnchor="start" fill="currentColor" fontSize="11" fontWeight="600" className="text-green-500">a = {aL}</text>
      <text x={cx + w / 2 + 6} y={cy + h2 / 2 + 4} textAnchor="start" fill="currentColor" fontSize="11" fontWeight="600" className="text-red-500">b = {bL}</text>
      {angleLabels?.[A] && <text x={cx + 4} y={cy - h1 + 14} textAnchor="start" fill="currentColor" fontSize="10" fontWeight="700" className="text-purple-500">∠{A} = {angleLabels[A]}°</text>}
    </svg>
  );
}

export function IsoscelesTrapezoidDiagram({
  top, bottom, height, vertexLabels = ["A", "B", "C", "D"], sideLabels, angleLabels
}: { top: number; bottom: number; height: number } & LabelProps) {
  const b = 120, t = 60, h = 70, x = 50, y = 80;
  const offset = (b - t) / 2;
  const [A, B, C, D] = vertexLabels;
  const topL = sideLabels?.top ?? top;
  const botL = sideLabels?.bottom ?? bottom;
  const hL = sideLabels?.height ?? height;
  return (
    <svg viewBox="0 0 220 220" className="w-full max-w-[280px] h-auto mx-auto">
      <polygon points={`${x + offset},${y - h} ${x + offset + t},${y - h} ${x + b},${y} ${x},${y}`} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-blue-500" />
      {/* Equal sides markers (tick marks) */}
      <line x1={x + offset / 2} y1={y - h / 2 - 3} x2={x + offset / 2} y2={y - h / 2 + 3} stroke="currentColor" strokeWidth="2" className="text-blue-500" />
      <line x1={x + b + offset / 2} y1={y - h / 2 - 3} x2={x + b + offset / 2} y2={y - h / 2 + 3} stroke="currentColor" strokeWidth="2" className="text-blue-500" />
      {/* Height dashed */}
      <line x1={x + offset + t / 2} y1={y - h} x2={x + offset + t / 2} y2={y} stroke="currentColor" strokeWidth="1.5" strokeDasharray="4,4" className="text-gray-400" />
      {/* Vertex labels */}
      <text x={x + offset - 6} y={y - h - 6} textAnchor="end" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{A}</text>
      <text x={x + offset + t + 6} y={y - h - 6} textAnchor="start" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{B}</text>
      <text x={x + b + 6} y={y + 16} textAnchor="start" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{C}</text>
      <text x={x - 6} y={y + 16} textAnchor="end" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{D}</text>
      {/* Side labels */}
      <text x={x + offset + t / 2} y={y - h - 10} textAnchor="middle" fill="currentColor" fontSize="11" fontWeight="600" className="text-green-500">top = {topL}</text>
      <text x={x + b / 2} y={y + 18} textAnchor="middle" fill="currentColor" fontSize="11" fontWeight="600" className="text-red-500">base = {botL}</text>
      <text x={x + offset + t / 2 + 6} y={y - h / 2} textAnchor="start" fill="currentColor" fontSize="11" fontWeight="600" className="text-gray-400">h = {hL}</text>
      {angleLabels?.[A] && <text x={x + offset + 8} y={y - h + 14} textAnchor="start" fill="currentColor" fontSize="10" fontWeight="700" className="text-purple-500">∠{A} = {angleLabels[A]}°</text>}
    </svg>
  );
}
