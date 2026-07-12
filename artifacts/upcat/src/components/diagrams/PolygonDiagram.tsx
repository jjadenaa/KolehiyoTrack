export function PolygonDiagram({ sides, side, vertexLabels }: { sides: number; side: number; vertexLabels?: string[] }) {
  const cx = 110, cy = 100, r = 70;
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (2 * Math.PI * i) / sides - Math.PI / 2;
    points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  const names: Record<number, string> = { 5: "Pentagon", 6: "Hexagon", 7: "Heptagon", 8: "Octagon" };
  return (
    <svg viewBox="0 0 220 220" className="w-full max-w-[280px] h-auto mx-auto">
      <polygon points={points.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-blue-500" />
      {/* Vertex labels */}
      {points.map((p, i) => {
        const label = vertexLabels?.[i] ?? String.fromCharCode(65 + i);
        const dx = p.x - cx;
        const dy = p.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const tx = p.x + (dx / dist) * 14;
        const ty = p.y + (dy / dist) * 14;
        return (
          <text key={i} x={tx} y={ty} textAnchor="middle" fill="currentColor" fontSize="12" fontWeight="700" className="text-blue-500">
            {label}
          </text>
        );
      })}
      <text x={cx} y={cy + r + 28} textAnchor="middle" fill="currentColor" fontSize="12" fontWeight="600" className="text-green-500">
        s = {side} ({names[sides] || `${sides}-gon`})
      </text>
    </svg>
  );
}
