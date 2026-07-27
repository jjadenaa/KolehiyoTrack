export function CircleDiagram({
  radius,
  centerLabel = "O",
  inscribedSquare = false,
  shadedArea = false,
  chords = false,
  tangents = false,
  sideLabels,
}: {
  radius?: number;
  centerLabel?: string;
  inscribedSquare?: boolean;
  shadedArea?: boolean;
  chords?: boolean;
  tangents?: boolean;
  sideLabels?: Record<string, string>;
}) {
  const cx = 110,
    cy = 110,
    r = 70;

  return (
    <svg viewBox="0 0 220 220" className="w-full max-w-[280px] h-auto mx-auto">
      {shadedArea && (
        <circle cx={cx} cy={cy} r={r} fill="currentColor" fillOpacity="0.1" className="text-blue-500" />
      )}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-blue-500" />

      {inscribedSquare && (
        <rect
          x={cx - r / Math.sqrt(2)}
          y={cy - r / Math.sqrt(2)}
          width={(r * 2) / Math.sqrt(2)}
          height={(r * 2) / Math.sqrt(2)}
          fill={shadedArea ? "white" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          className="text-green-500"
        />
      )}

      {chords && (
        <>
          <line x1={cx - r + 10} y1={cy - 40} x2={cx + r - 10} y2={cy + 40} stroke="currentColor" strokeWidth="2" className="text-purple-500" />
          <line x1={cx - r + 20} y1={cy + 30} x2={cx + r - 30} y2={cy - 50} stroke="currentColor" strokeWidth="2" className="text-purple-500" />
        </>
      )}

      {tangents && (
        <line x1={cx - r} y1={cy - r - 20} x2={cx + r} y2={cy - r - 20} stroke="currentColor" strokeWidth="2" className="text-red-500" />
      )}

      {!inscribedSquare && !chords && !tangents && (
        <>
          <line x1={cx} y1={cy} x2={cx + r} y2={cy} stroke="currentColor" strokeWidth="2" strokeDasharray="5,3" className="text-red-500" />
          <text x={cx + r / 2} y={cy + 14} textAnchor="middle" fill="currentColor" fontSize="12" fontWeight="600" className="text-red-500">
            {radius ? `r = ${radius}` : "r"}
          </text>
        </>
      )}

      <circle cx={cx} cy={cy} r={4} fill="currentColor" className="text-blue-500" />
      <text x={cx - 8} y={cy - 8} textAnchor="end" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">
        {centerLabel}
      </text>
    </svg>
  );
}
