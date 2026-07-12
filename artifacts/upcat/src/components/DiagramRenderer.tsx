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
}

export function DiagramRenderer({ diagram }: Props) {
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
        match = { type: "circle", params: { radius: r, centerLabel: vertices?.[0] ?? "O" } };
        break;
      }
      case "rightTriangle": {
        const a = Number(sides?.a ?? sides?.vertical ?? 3);
        const b = Number(sides?.b ?? sides?.horizontal ?? 4);
        const c = sides?.c ? Number(sides.c) : undefined;
        match = { type: "rightTriangle", params: { a, b, c, ...labelProps } };
        break;
      }
      case "isoscelesTriangle": {
        const base = Number(sides?.base ?? 6);
        const equal = Number(sides?.equal ?? 5);
        match = { type: "isoscelesTriangle", params: { base, equal, ...labelProps } };
        break;
      }
      case "equilateralTriangle": {
        const side = Number(sides?.side ?? sides?.s ?? 5);
        match = { type: "equilateralTriangle", params: { side, ...labelProps } };
        break;
      }
      case "scaleneTriangle": {
        const a = Number(sides?.a ?? 5);
        const b = Number(sides?.b ?? 7);
        const c = Number(sides?.c ?? 9);
        match = { type: "scaleneTriangle", params: { a, b, c, ...labelProps } };
        break;
      }
      case "square": {
        const side = Number(sides?.side ?? sides?.s ?? 5);
        match = { type: "square", params: { side, ...labelProps } };
        break;
      }
      case "rectangle": {
        const w = Number(sides?.width ?? sides?.w ?? 6);
        const h = Number(sides?.height ?? sides?.h ?? 4);
        match = { type: "rectangle", params: { width: w, height: h, ...labelProps } };
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
        match = { type: "trapezoid", params: { top, bottom, height, ...labelProps } };
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
        const side = Number(sides?.side ?? sides?.s ?? 5);
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
        const sidesCount = params?.sides ?? 5;
        const side = Number(sides?.side ?? sides?.s ?? 4);
        match = { type: "polygon", params: { sides: sidesCount, side, vertexLabels: vertices } };
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
        return <CircleDiagram radius={rest.radius} centerLabel={vertexLabels?.[0] ?? "O"} />;
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
        return <RectangleDiagram width={rest.width} height={rest.height} vertexLabels={vertexLabels} sideLabels={sideLabels} angleLabels={angleLabels} />;
      case "parallelogram":
        return <ParallelogramDiagram base={rest.base} side={rest.side} vertexLabels={vertexLabels} sideLabels={sideLabels} angleLabels={angleLabels} />;
      case "trapezoid":
        return <TrapezoidDiagram top={rest.top} bottom={rest.bottom} height={rest.height} vertexLabels={vertexLabels} sideLabels={sideLabels} angleLabels={angleLabels} />;
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
