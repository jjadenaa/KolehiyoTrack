export function ParallelLinesDiagram({ angle1, angle2, angleLabels }: { angle1?: number; angle2?: number; angleLabels?: Record<string, string> }) {
  const yTop = 50, yBot = 130, pad = 30, w = 220;
  const tAngle = -12; // transversal slope
  // Draw parallel lines
  return (
    <svg viewBox={`0 0 ${w + pad * 2} 170`} className="w-full max-w-[280px] h-auto mx-auto">
      {/* Top parallel line */}
      <line x1={pad} y1={yTop} x2={pad + w} y2={yTop} stroke="currentColor" strokeWidth="2.5" className="text-blue-500" />
      <polygon points={`${pad},${yTop} ${pad + 8},${yTop - 5} ${pad + 8},${yTop + 5}`} fill="currentColor" className="text-blue-500" />
      <polygon points={`${pad + w},${yTop} ${pad + w - 8},${yTop - 5} ${pad + w - 8},${yTop + 5}`} fill="currentColor" className="text-blue-500" />
      {/* Bottom parallel line */}
      <line x1={pad} y1={yBot} x2={pad + w} y2={yBot} stroke="currentColor" strokeWidth="2.5" className="text-blue-500" />
      <polygon points={`${pad},${yBot} ${pad + 8},${yBot - 5} ${pad + 8},${yBot + 5}`} fill="currentColor" className="text-blue-500" />
      <polygon points={`${pad + w},${yBot} ${pad + w - 8},${yBot - 5} ${pad + w - 8},${yBot + 5}`} fill="currentColor" className="text-blue-500" />
      {/* Transversal */}
      <line x1={pad + w / 2 - 40} y1={yTop - 20} x2={pad + w / 2 + 40} y2={yBot + 20} stroke="currentColor" strokeWidth="2" className="text-red-500" />
      {/* Intersection dots */}
      <circle cx={pad + w / 2} cy={yTop} r={4} fill="currentColor" className="text-red-500" />
      <circle cx={pad + w / 2} cy={yBot} r={4} fill="currentColor" className="text-red-500" />
      {/* Angle numbers 1-4 at top, 5-8 at bottom */}
      <text x={pad + w / 2 + 12} y={yTop - 6} textAnchor="start" fill="currentColor" fontSize="11" fontWeight="700" className="text-red-500">1</text>
      <text x={pad + w / 2 - 14} y={yTop - 6} textAnchor="end" fill="currentColor" fontSize="11" fontWeight="700" className="text-red-500">2</text>
      <text x={pad + w / 2 - 14} y={yTop + 16} textAnchor="end" fill="currentColor" fontSize="11" fontWeight="700" className="text-red-500">3</text>
      <text x={pad + w / 2 + 12} y={yTop + 16} textAnchor="start" fill="currentColor" fontSize="11" fontWeight="700" className="text-red-500">4</text>
      <text x={pad + w / 2 + 12} y={yBot - 6} textAnchor="start" fill="currentColor" fontSize="11" fontWeight="700" className="text-red-500">5</text>
      <text x={pad + w / 2 - 14} y={yBot - 6} textAnchor="end" fill="currentColor" fontSize="11" fontWeight="700" className="text-red-500">6</text>
      <text x={pad + w / 2 - 14} y={yBot + 16} textAnchor="end" fill="currentColor" fontSize="11" fontWeight="700" className="text-red-500">7</text>
      <text x={pad + w / 2 + 12} y={yBot + 16} textAnchor="start" fill="currentColor" fontSize="11" fontWeight="700" className="text-red-500">8</text>
      {/* Angle value labels if known */}
      {angle1 !== undefined && (
        <text x={pad + w / 2 + 30} y={yTop - 14} textAnchor="start" fill="currentColor" fontSize="11" fontWeight="700" className="text-green-500">
          ∠ = {angle1}°
        </text>
      )}
      {angle2 !== undefined && (
        <text x={pad + w / 2 + 30} y={yBot - 14} textAnchor="start" fill="currentColor" fontSize="11" fontWeight="700" className="text-green-500">
          ∠ = {angle2}°
        </text>
      )}
    </svg>
  );
}
