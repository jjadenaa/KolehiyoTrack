import type { DiagramSpec } from "@/types/diagram";
import {
  CircleDiagram,
  RightTriangleDiagram,
  IsoscelesTriangleDiagram,
  EquilateralTriangleDiagram,
  ScaleneTriangleDiagram,
  SquareDiagram,
  RectangleDiagram,
  ParallelogramDiagram,
  TrapezoidDiagram,
  RhombusDiagram,
  KiteDiagram,
  IsoscelesTrapezoidDiagram,
  PolygonDiagram,
  AngleDiagram,
  NumberLineDiagram,
  BarChartDiagram,
  ParallelLinesDiagram,
  SimilarTrianglesDiagram,
} from "@/components/diagrams";

interface Props {
  /** Explicit diagram spec from question.diagram */
  diagram?: DiagramSpec;
  /** Optional question text to infer shape parameters like hexagon/pentagon or missing side values */
  questionText?: string;
}

export function DiagramRenderer({ diagram, questionText }: Props) {
  let match: { type: string; params: Record<string, any> } | null = null;

  if (diagram) {
    const { shape, vertices, sides, angles, show, params = {} } = diagram;
    const normalizedShow = show ?? [];
    const labelProps = {
      vertexLabels: vertices,
      sideLabels: sides,
      angleLabels: angles,
    };

    // Build params based on shape
    switch (shape) {
      case "circle": {
        const r = Number(sides?.r ?? sides?.radius ?? params?.radius ?? 5);
        const inscribedSquare = Boolean(params?.inscribedSquare || params?.inscribed || questionText?.toLowerCase().includes("inscribed"));
        const shadedArea = Boolean(params?.shaded || params?.shadedArea || questionText?.toLowerCase().includes("shaded"));
        const chords = Boolean(params?.chords || questionText?.toLowerCase().includes("chord") || questionText?.toLowerCase().includes("secant"));
        const tangents = Boolean(params?.tangents || questionText?.toLowerCase().includes("tangent"));
        match = { type: "circle", params: { radius: r, centerLabel: vertices?.[0] ?? "O", inscribedSquare, shadedArea, chords, tangents, sideLabels: sides } };
        break;
      }
      case "rightTriangle": {
        const [vA = "A", vB = "B", vC = "C"] = vertices ?? ["A", "B", "C"];
        const sideAB = sides?.[`${vA}${vB}`] ?? sides?.[`${vB}${vA}`] ?? sides?.AB ?? sides?.BA;
        const sideBC = sides?.[`${vB}${vC}`] ?? sides?.[`${vC}${vB}`] ?? sides?.BC ?? sides?.CB;
        const sideAC = sides?.[`${vA}${vC}`] ?? sides?.[`${vC}${vA}`] ?? sides?.AC ?? sides?.CA;

        let aVal = Number(sides?.a ?? sides?.vertical ?? sides?.opposite ?? sideAB);
        let bVal = Number(sides?.b ?? sides?.horizontal ?? sides?.adjacent ?? sideBC);
        let cVal: number | undefined = sides?.c ?? sides?.hypotenuse ?? sideAC ? Number(sides?.c ?? sides?.hypotenuse ?? sideAC) : undefined;

        let derivedAngleC: string | undefined = angles?.[vC];
        let derivedAngleA: string | undefined = angles?.[vA];

        if (questionText) {
          const qText = questionText;
          // Check for building elevation problems: "X meters from base", "angle of elevation ... Y°"
          const baseMatch = qText.match(/(\d+(?:\.\d+)?)\s*(?:meters?|m|cm|ft|feet)?\s*from\s*(?:the)?\s*base/i)
                         || qText.match(/base\s*(?:is|=|:)?\s*(\d+(?:\.\d+)?)/i);
          const elevMatch = qText.match(/angle\s*of\s*elevation\s*(?:[^\d]*)\s*(\d+(?:\.\d+)?)/i);
          if (baseMatch) {
            bVal = Number(baseMatch[1]);
          }
          if (elevMatch) {
            derivedAngleC = `${elevMatch[1]}°`;
            if (bVal && !isNaN(bVal)) {
              const rad = (Number(elevMatch[1]) * Math.PI) / 180;
              aVal = Math.round(bVal * Math.tan(rad) * 100) / 100;
            }
          }

          // Check for trigonometry problem: "opposite side is 3", "hypotenuse is 5", "sin θ"
          const oppMatch = qText.match(/opposite(?:\s*side)?\s*(?:is|=|:)?\s*(\d+(?:\.\d+)?)/i);
          const hypMatch = qText.match(/hypotenuse\s*(?:is|=|:)?\s*(\d+(?:\.\d+)?)/i);
          const adjMatch = qText.match(/adjacent(?:\s*side)?\s*(?:is|=|:)?\s*(\d+(?:\.\d+)?)/i);
          const hasTheta = /θ|theta|sin\s*θ|cos\s*θ|tan\s*θ/i.test(qText);

          if (oppMatch) aVal = Number(oppMatch[1]);
          if (adjMatch) bVal = Number(adjMatch[1]);
          if (hypMatch) cVal = Number(hypMatch[1]);
          if (hasTheta && !derivedAngleC) {
            derivedAngleC = "θ";
          }
        }

        if (isNaN(aVal) && sideAB) aVal = Number(sideAB);
        if (isNaN(bVal) && sideBC) bVal = Number(sideBC);

        // Pythagorean calculations if values missing
        if ((!aVal || isNaN(aVal)) && bVal && !isNaN(bVal) && cVal && !isNaN(cVal)) {
          aVal = Math.round(Math.sqrt(cVal * cVal - bVal * bVal) * 100) / 100;
        }
        if ((!bVal || isNaN(bVal)) && aVal && !isNaN(aVal) && cVal && !isNaN(cVal)) {
          bVal = Math.round(Math.sqrt(cVal * cVal - aVal * aVal) * 100) / 100;
        }
        if ((!cVal || isNaN(cVal)) && aVal && !isNaN(aVal) && bVal && !isNaN(bVal)) {
          cVal = Math.round(Math.sqrt(aVal * aVal + bVal * bVal) * 100) / 100;
        }

        const a = !isNaN(aVal) && aVal > 0 ? aVal : 3;
        const b = !isNaN(bVal) && bVal > 0 ? bVal : 4;
        const c = cVal && !isNaN(cVal) && cVal > 0 ? cVal : undefined;

        const mergedSideLabels = {
          a: String(sides?.a ?? sides?.vertical ?? sides?.opposite ?? a),
          b: String(sides?.b ?? sides?.horizontal ?? sides?.adjacent ?? b),
          c: sideAC || sides?.c || sides?.hypotenuse ? String(sideAC ?? sides?.c ?? sides?.hypotenuse ?? (c ? String(c) : "")) : (c ? String(c) : undefined),
          ...sides,
        };

        const mergedAngleLabels = {
          ...(derivedAngleC ? { [vC]: derivedAngleC } : {}),
          ...(derivedAngleA ? { [vA]: derivedAngleA } : {}),
          ...angles,
        };

        match = { type: "rightTriangle", params: { a, b, c, ...labelProps, sideLabels: mergedSideLabels, angleLabels: mergedAngleLabels } };
        break;
      }
      case "isoscelesTriangle": {
        const base = Number(sides?.base ?? sides?.b ?? 6);
        const equal = Number(sides?.equal ?? sides?.eq ?? sides?.side ?? sides?.s ?? 5);
        match = { type: "isoscelesTriangle", params: { base, equal, ...labelProps } };
        break;
      }
      case "equilateralTriangle": {
        const side = Number(sides?.side ?? sides?.s ?? sides?.equal ?? sides?.a ?? 5);
        match = { type: "equilateralTriangle", params: { side, ...labelProps } };
        break;
      }
      case "scaleneTriangle": {
        const [vA = "A", vB = "B", vC = "C"] = vertices ?? ["A", "B", "C"];
        const sideAB = sides?.[`${vA}${vB}`] ?? sides?.[`${vB}${vA}`] ?? sides?.AB;
        const sideBC = sides?.[`${vB}${vC}`] ?? sides?.[`${vC}${vB}`] ?? sides?.BC;
        const sideAC = sides?.[`${vA}${vC}`] ?? sides?.[`${vC}${vA}`] ?? sides?.AC;

        const a = Number(sides?.a ?? sideAB ?? 5);
        const b = Number(sides?.b ?? sideAC ?? 7);
        const c = Number(sides?.c ?? sideBC ?? 9);
        match = { type: "scaleneTriangle", params: { a, b, c, ...labelProps } };
        break;
      }
      case "square": {
        const side = Number(sides?.side ?? sides?.s ?? sides?.equal ?? sides?.a ?? 5);
        match = { type: "square", params: { side, ...labelProps } };
        break;
      }
      case "rectangle": {
        const parseNum = (val: any): number => {
          if (typeof val === 'number') return val;
          if (typeof val === 'string') {
            const m = val.match(/(\d+(?:\.\d+)?)/);
            if (m) return Number(m[1]);
          }
          return NaN;
        };

        let w = parseNum(sides?.width ?? sides?.w ?? sides?.base ?? sides?.AB ?? sides?.top);
        let h = parseNum(sides?.height ?? sides?.h ?? sides?.length ?? sides?.BC ?? sides?.right);
        let diagLabel: string | undefined = (diagram as any)?.diagonalLabel || (diagram as any)?.diagonal || params?.diagonalLabel || params?.diagonal;

        if (questionText) {
          const lenMatch = questionText.match(/length\s*(?:of)?\s*(\d+(?:\.\d+)?)/i);
          const widMatch = questionText.match(/width\s*(?:of)?\s*(\d+(?:\.\d+)?)/i);
          const diagMatch = questionText.match(/diagonal\s*(?:of)?\s*(\d+(?:\.\d+)?)/i);

          if (widMatch && isNaN(w)) w = Number(widMatch[1]);
          if (lenMatch && isNaN(h)) h = Number(lenMatch[1]);
          if (diagMatch && !diagLabel) {
            const diagVal = Number(diagMatch[1]);
            diagLabel = `${diagVal} cm`;
          }
        }

        if (isNaN(w) || !w) w = 6;
        if (isNaN(h) || !h) h = 4;

        match = { type: "rectangle", params: { width: w, height: h, diagonalLabel: diagLabel, ...labelProps } };
        break;
      }
      case "parallelogram": {
        const base = Number(sides?.base ?? sides?.b ?? 6);
        const side = Number(sides?.side ?? sides?.s ?? 4);
        match = { type: "parallelogram", params: { base, side, ...labelProps } };
        break;
      }
      case "trapezoid": {
        const top = Number(sides?.top ?? sides?.t ?? 4);
        const bottom = Number(sides?.bottom ?? sides?.b ?? 8);
        const height = Number(sides?.height ?? sides?.h ?? 3);
        const showMedian = Boolean(params?.median || params?.showMedian || sides?.median || questionText?.toLowerCase().includes("median"));
        const showDiagonals = Boolean(params?.diagonals || params?.showDiagonals || questionText?.toLowerCase().includes("diagonal"));
        const medianLabel = sides?.median ? String(sides.median) : params?.median ? String(params.median) : undefined;
        match = { type: "trapezoid", params: { top, bottom, height, showMedian, showDiagonals, medianLabel, ...labelProps } };
        break;
      }
      case "isoscelesTrapezoid": {
        const top = Number(sides?.top ?? sides?.t ?? 4);
        const bottom = Number(sides?.bottom ?? sides?.b ?? 8);
        const height = Number(sides?.height ?? sides?.h ?? 3);
        match = { type: "isoscelesTrapezoid", params: { top, bottom, height, ...labelProps } };
        break;
      }
      case "rhombus": {
        const side = Number(sides?.side ?? sides?.s ?? sides?.equal ?? 5);
        match = { type: "rhombus", params: { side, ...labelProps } };
        break;
      }
      case "kite": {
        const a = Number(sides?.a ?? sides?.sideA ?? 5);
        const b = Number(sides?.b ?? sides?.sideB ?? 4);
        match = { type: "kite", params: { sideA: a, sideB: b, ...labelProps } };
        break;
      }
      case "polygon": {
        let sidesCount = params?.sides ?? params?.sidesCount ?? params?.n ?? sides?.sides ?? sides?.n;
        if (!sidesCount) {
          const textToSearch = `${questionText ?? ""} ${diagram.shape} ${params?.shape ?? ""}`.toLowerCase();
          if (textToSearch.includes("hexagon")) sidesCount = 6;
          else if (textToSearch.includes("pentagon")) sidesCount = 5;
          else if (textToSearch.includes("heptagon")) sidesCount = 7;
          else if (textToSearch.includes("octagon")) sidesCount = 8;
          else if (textToSearch.includes("nonagon")) sidesCount = 9;
          else if (textToSearch.includes("decagon")) sidesCount = 10;
          else sidesCount = 5;
        }

        let sideVal = Number(sides?.side ?? sides?.s ?? sides?.equal ?? sides?.length ?? sides?.a);
        if (isNaN(sideVal) && sides) {
          const firstVal = Object.values(sides).find((v) => !isNaN(Number(v)));
          if (firstVal !== undefined) sideVal = Number(firstVal);
        }
        if (isNaN(sideVal) && questionText) {
          const matchLen = questionText.match(/side(?:\s+length)?(?:\s+of)?\s+(\d+(?:\.\d+)?)/i);
          if (matchLen) sideVal = Number(matchLen[1]);
        }
        const side = !isNaN(sideVal) && sideVal > 0 ? sideVal : 5;

        match = { type: "polygon", params: { sides: Number(sidesCount) || 5, side, vertexLabels: vertices } };
        break;
      }
      case "angle": {
        const deg = Number(angles?.[vertices?.[0] ?? ""] ?? params?.degrees ?? 45);
        match = { type: "angle", params: { degrees: deg, vertexLabels: vertices } };
        break;
      }
      case "numberLine": {
        const center = Number(params?.center ?? 0);
        match = { type: "numberLine", params: { center } };
        break;
      }
      case "barChart": {
        const values = params?.values ?? [12, 28, 40, 20];
        match = { type: "barChart", params: { values } };
        break;
      }
      case "parallelLines": {
        const angle1 = params?.angle1 ?? undefined;
        const angle2 = params?.angle2 ?? undefined;
        match = { type: "parallelLines", params: { angle1, angle2, angleLabels: angles } };
        break;
      }
      case "similarTriangles": {
        const ratio = Number(params?.ratio ?? 2);
        match = { type: "similarTriangles", params: { ratio, vertexLabels: vertices } };
        break;
      }
    }
  }

  if (!match) return null;

  const { type, params } = match;
  const { vertexLabels, sideLabels, angleLabels, ...rest } = params;

  const component = (() => {
    switch (type) {
      case "circle":
        return (
          <CircleDiagram
            radius={rest.radius}
            centerLabel={vertexLabels?.[0] ?? "O"}
            inscribedSquare={rest.inscribedSquare}
            shadedArea={rest.shadedArea}
            chords={rest.chords}
            tangents={rest.tangents}
            sideLabels={sideLabels}
          />
        );
      case "rightTriangle":
        return <RightTriangleDiagram a={rest.a} b={rest.b} c={rest.c} vertexLabels={vertexLabels} sideLabels={sideLabels} angleLabels={angleLabels} />;
      case "isoscelesTriangle":
        return <IsoscelesTriangleDiagram base={rest.base} equal={rest.equal} vertexLabels={vertexLabels} sideLabels={sideLabels} angleLabels={angleLabels} />;
      case "equilateralTriangle":
        return <EquilateralTriangleDiagram side={rest.side} vertexLabels={vertexLabels} sideLabels={sideLabels} angleLabels={angleLabels} />;
      case "scaleneTriangle":
        return <ScaleneTriangleDiagram a={rest.a} b={rest.b} c={rest.c} vertexLabels={vertexLabels} sideLabels={sideLabels} angleLabels={angleLabels} />;
      case "square":
        return <SquareDiagram side={rest.side} vertexLabels={vertexLabels} sideLabels={sideLabels} angleLabels={angleLabels} />;
      case "rectangle":
        return <RectangleDiagram width={rest.width} height={rest.height} diagonalLabel={rest.diagonalLabel} vertexLabels={vertexLabels} sideLabels={sideLabels} angleLabels={angleLabels} />;
      case "parallelogram":
        return <ParallelogramDiagram base={rest.base} side={rest.side} vertexLabels={vertexLabels} sideLabels={sideLabels} angleLabels={angleLabels} />;
      case "trapezoid":
        return <TrapezoidDiagram top={rest.top} bottom={rest.bottom} height={rest.height} showMedian={rest.showMedian} showDiagonals={rest.showDiagonals} medianLabel={rest.medianLabel} vertexLabels={vertexLabels} sideLabels={sideLabels} angleLabels={angleLabels} />;
      case "rhombus":
        return <RhombusDiagram side={rest.side} vertexLabels={vertexLabels} sideLabels={sideLabels} angleLabels={angleLabels} />;
      case "kite":
        return <KiteDiagram sideA={rest.sideA} sideB={rest.sideB} vertexLabels={vertexLabels} sideLabels={sideLabels} angleLabels={angleLabels} />;
      case "isoscelesTrapezoid":
        return <IsoscelesTrapezoidDiagram top={rest.top} bottom={rest.bottom} height={rest.height} vertexLabels={vertexLabels} sideLabels={sideLabels} angleLabels={angleLabels} />;
      case "polygon":
        return <PolygonDiagram sides={rest.sides} side={rest.side} vertexLabels={vertexLabels} />;
      case "angle":
        return <AngleDiagram degrees={rest.degrees} vertexLabels={vertexLabels} />;
      case "numberLine":
        return <NumberLineDiagram center={rest.center} />;
      case "barChart":
        return <BarChartDiagram values={rest.values} />;
      case "parallelLines":
        return <ParallelLinesDiagram angle1={rest.angle1} angle2={rest.angle2} angleLabels={angleLabels} />;
      case "similarTriangles":
        return <SimilarTrianglesDiagram ratio={rest.ratio} vertexLabels={vertexLabels} />;
      default:
        return null;
    }
  })();

  if (!component) return null;

  return (
    <div className="my-4 p-4 rounded-lg border bg-card/50 flex justify-center">
      {component}
    </div>
  );
}
