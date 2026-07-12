export function BarChartDiagram({ values }: { values: number[] }) {
  const maxVal = Math.max(...values, 1);
  const barW = 30, gap = 12, h = 120, pad = 20;
  const totalW = values.length * barW + (values.length + 1) * gap;
  return (
    <svg viewBox={`0 0 ${totalW + pad * 2} ${h + pad * 2 + 20}`} className="w-full max-w-[280px] h-auto mx-auto">
      {/* Y-axis */}
      <line x1={pad} y1={pad} x2={pad} y2={pad + h} stroke="currentColor" strokeWidth="1.5" className="text-gray-400" />
      {/* X-axis */}
      <line x1={pad} y1={pad + h} x2={pad + totalW} y2={pad + h} stroke="currentColor" strokeWidth="1.5" className="text-gray-400" />
      {/* Bars */}
      {values.map((v, i) => {
        const barH = (v / maxVal) * h;
        const x = pad + gap + i * (barW + gap);
        const y = pad + h - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} fill="currentColor" opacity={0.8} rx={3} className="text-blue-500" />
            <text x={x + barW / 2} y={y - 6} textAnchor="middle" fill="currentColor" fontSize="11" fontWeight="600" className="text-foreground">
              {v}
            </text>
            <text x={x + barW / 2} y={pad + h + 14} textAnchor="middle" fill="currentColor" fontSize="11" className="text-gray-500">
              {String.fromCharCode(65 + i)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
