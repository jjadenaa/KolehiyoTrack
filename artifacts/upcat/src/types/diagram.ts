export interface DiagramSpec {
  shape:
    | "circle"
    | "rightTriangle"
    | "isoscelesTriangle"
    | "equilateralTriangle"
    | "scaleneTriangle"
    | "square"
    | "rectangle"
    | "parallelogram"
    | "trapezoid"
    | "isoscelesTrapezoid"
    | "rhombus"
    | "kite"
    | "polygon"
    | "angle"
    | "numberLine"
    | "barChart"
    | "parallelLines"
    | "similarTriangles";
  /** Vertex letters in order. For triangles: [A, B, C]. For quadrilaterals: [A, B, C, D]. */
  vertices?: string[];
  /** Side lengths keyed by side name. Use "?" for unknowns.
   *  Right triangle: { a, b, c } or { AB, BC, AC }
   *  Other shapes: { side, base, width, height, top, bottom, equal } */
  sides?: Record<string, string>;
  /** Angle measures with ° sign, keyed by vertex letter. e.g. { B: "30°" } */
  angles?: Record<string, string>;
  /** What visual elements to show. Defaults depend on shape. */
  show?: ("vertices" | "sides" | "angles" | "rightAngleMark" | "heightDashed")[];
  /** Extra shape-specific params */
  params?: Record<string, any>;
}
