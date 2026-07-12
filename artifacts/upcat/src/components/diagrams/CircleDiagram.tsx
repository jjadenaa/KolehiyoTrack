export function CircleDiagram({ radius, centerLabel = "O" }: { radius: number; centerLabel?: string }) {
  const cx = 110, cy = 110, r = 70;
  return (
    <svg viewBox="0 0 220 220" className="w-full max-w-[280px] h-auto mx-auto">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-blue-500" />
      <line x1={cx} y1={cy} x2={cx + r} y2={cy} stroke="currentColor" strokeWidth="2" strokeDasharray="5,3" className="text-red-500" />
      <circle cx={cx} cy={cy} r={4} fill="currentColor" className="text-blue-500" />
      <text x={cx - 8} y={cy - 8} textAnchor="end" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{centerLabel}</text>
      <text x={cx + r / 2} y={cy + 14} textAnchor="middle" fill="currentColor" fontSize="12" fontWeight="600" className="text-red-500">r = {radius}</text>
    </svg>
  );
}
