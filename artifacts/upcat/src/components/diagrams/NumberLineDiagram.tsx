export function NumberLineDiagram({ center }: { center: number }) {
  const min = center - 5, max = center + 5;
  const y = 50, pad = 20, w = 260;
  const toX = (n: number) => pad + ((n - min) / (max - min)) * w;
  return (
    <svg viewBox={`0 0 ${w + pad * 2} 90`} className="w-full max-w-[280px] h-auto mx-auto">
      {/* Line */}
      <line x1={pad} y1={y} x2={pad + w} y2={y} stroke="currentColor" strokeWidth="2" className="text-blue-500" />
      {/* Arrows */}
      <polygon points={`${pad},${y} ${pad + 8},${y - 5} ${pad + 8},${y + 5}`} fill="currentColor" className="text-blue-500" />
      <polygon points={`${pad + w},${y} ${pad + w - 8},${y - 5} ${pad + w - 8},${y + 5}`} fill="currentColor" className="text-blue-500" />
      {/* Ticks and labels */}
      {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
        <g key={n}>
          <line x1={toX(n)} y1={y - 6} x2={toX(n)} y2={y + 6} stroke="currentColor" strokeWidth="2" className="text-blue-500" />
          <text x={toX(n)} y={y + 22} textAnchor="middle" fill="currentColor" fontSize="11" fontWeight={n === center ? "700" : "400"} className={n === center ? "text-red-500" : "text-foreground"}>
            {n}
          </text>
        </g>
      ))}
      {/* Highlight center */}
      <circle cx={toX(center)} cy={y} r={5} fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500" />
    </svg>
  );
}
