export function AngleDiagram({ degrees, vertexLabels }: { degrees: number; vertexLabels?: string[] }) {
  const cx = 120, cy = 130, r = 70;
  const endAngle = (degrees * Math.PI) / 180;
  const largeArc = degrees > 180 ? 1 : 0;
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy - r * Math.sin(endAngle);
  const label = vertexLabels?.[0];
  return (
    <svg viewBox="0 0 240 160" className="w-full max-w-[280px] h-auto mx-auto">
      <line x1={cx} y1={cy} x2={cx + r + 20} y2={cy} stroke="currentColor" strokeWidth="2.5" className="text-blue-500" />
      <line x1={cx} y1={cy} x2={x2} y2={y2} stroke="currentColor" strokeWidth="2.5" className="text-blue-500" />
      <path
        d={`M ${cx + 25} ${cy} A 25 25 0 ${largeArc} 0 ${cx + 25 * Math.cos(endAngle)} ${cy - 25 * Math.sin(endAngle)}`}
        fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500"
      />
      <circle cx={cx} cy={cy} r={4} fill="currentColor" className="text-blue-500" />
      {/* Vertex label */}
      {label && <text x={cx - 6} y={cy + 14} textAnchor="end" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{label}</text>}
      <text x={cx + 45} y={cy - 12} textAnchor="start" fill="currentColor" fontSize="14" fontWeight="700" className="text-red-500">
        {degrees}°
      </text>
    </svg>
  );
}
