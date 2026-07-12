export function SimilarTrianglesDiagram({ ratio, vertexLabels }: { ratio: number; vertexLabels?: string[] }) {
  // Small triangle inside larger one, sharing top vertex
  const top = [100, 40];
  const bw1 = 60, bw2 = 120; // bottom widths
  const h1 = 50, h2 = 100;  // heights
  const yBase = top[1] + h2;
  const left1 = [top[0] - bw1 / 2, yBase - (h2 - h1)];
  const right1 = [top[0] + bw1 / 2, yBase - (h2 - h1)];
  const left2 = [top[0] - bw2 / 2, yBase];
  const right2 = [top[0] + bw2 / 2, yBase];
  // Default labels A/B/C for small, D/E/F for large if not provided
  const [A, B, C, D, E, F] = vertexLabels?.length ?
    vertexLabels : ["A", "B", "C", "D", "E", "F"];
  return (
    <svg viewBox="0 0 200 150" className="w-full max-w-[280px] h-auto mx-auto">
      {/* Large outer triangle */}
      <polygon points={`${top[0]},${top[1]} ${left2[0]},${left2[1]} ${right2[0]},${right2[1]}`} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-blue-500" />
      {/* Small inner triangle */}
      <polygon points={`${top[0]},${top[1]} ${left1[0]},${left1[1]} ${right1[0]},${right1[1]}`} fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500" />
      {/* Vertex labels */}
      <text x={top[0]} y={top[1] - 8} textAnchor="middle" fill="currentColor" fontSize="13" fontWeight="700" className="text-blue-500">{A === D ? A : `${A}/${D}`}</text>
      <text x={left1[0] - 6} y={left1[1] + 14} textAnchor="end" fill="currentColor" fontSize="12" fontWeight="700" className="text-red-500">{B}</text>
      <text x={right1[0] + 6} y={right1[1] + 14} textAnchor="start" fill="currentColor" fontSize="12" fontWeight="700" className="text-red-500">{C}</text>
      <text x={left2[0] - 6} y={left2[1] + 14} textAnchor="end" fill="currentColor" fontSize="12" fontWeight="700" className="text-blue-500">{E}</text>
      <text x={right2[0] + 6} y={right2[1] + 14} textAnchor="start" fill="currentColor" fontSize="12" fontWeight="700" className="text-blue-500">{F}</text>
      {/* Ratio label */}
      <text x={top[0] + bw2 / 2 + 10} y={top[1] + h2 / 2} textAnchor="start" fill="currentColor" fontSize="11" fontWeight="700" className="text-green-500">
        ratio = {ratio}
      </text>
    </svg>
  );
}
