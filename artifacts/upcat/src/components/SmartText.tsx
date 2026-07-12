import { useRef, useEffect } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * SmartText renders body text in the normal font, but switches to monospace
 * for lines that look like ASCII diagrams, tables, or graphs.
 * It also renders **bold** markers as actual bold text, and $...$ / $$...$$ as KaTeX math.
 */

function MathElement({ math, displayMode }: { math: string, displayMode: boolean }) {
  const containerRef = useRef<HTMLSpanElement>(null);
  
  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(math, containerRef.current, {
          displayMode,
          throwOnError: false,
          output: 'htmlAndMathml'
        });
      } catch (e) {
        console.error("KaTeX rendering error:", e);
      }
    }
  }, [math, displayMode]);
  
  return <span ref={containerRef} className={displayMode ? "text-xl" : "text-lg"} />;
}

function isDiagramLine(line: string): boolean {
  if (line.trim() === "") return false;
  // Box-drawing or special math/diagram characters
  if (/[│─┌┐└┘├┤┬┴┼╔╗╚╝║═▲▼◄►]/.test(line)) return true;
  // Lines with 3+ table/graph chars (|, +, -, =, /, \)
  const specialCount = (line.match(/[|+\-=\/\\]/g) || []).length;
  if (specialCount >= 3) return true;
  // Lines that are mostly spaces + symbols (coordinate grids, number lines)
  const nonSpaceChars = line.replace(/\s/g, "");
  if (nonSpaceChars.length > 0 && (line.match(/\s/g) || []).length / line.length > 0.4 && specialCount >= 2) return true;
  return false;
}

interface Segment {
  text: string;
  mono: boolean;
}

function buildSegments(text: string): Segment[] {
  const lines = text.split("\n");
  const segments: Segment[] = [];

  for (const line of lines) {
    const mono = isDiagramLine(line);
    if (segments.length > 0 && segments[segments.length - 1].mono === mono) {
      segments[segments.length - 1].text += "\n" + line;
    } else {
      segments.push({ text: line, mono });
    }
  }

  return segments;
}

/**
 * Renders text with **bold** markers as <strong> elements, and math inside $...$ or $$...$$ using KaTeX.
 */
function RichText({ text }: { text: string }) {
  // First, parse out math
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const math = part.slice(2, -2);
          return <MathElement key={i} math={math} displayMode={true} />;
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1);
          return <MathElement key={i} math={math} displayMode={false} />;
        }
        
        // Bold parsing for the non-math text
        const boldParts = part.split(/(\*\*[\s\S]*?\*\*)/g);
        return (
          <span key={i}>
            {boldParts.map((bPart, j) => {
              if (bPart.startsWith("**") && bPart.endsWith("**")) {
                const inner = bPart.slice(2, -2);
                return <strong key={j} className="font-semibold">{inner}</strong>;
              }
              return <span key={j}>{bPart}</span>;
            })}
          </span>
        );
      })}
    </>
  );
}

interface SmartTextProps {
  text: string;
  className?: string;
}

export function SmartText({ text, className = "" }: SmartTextProps) {
  const segments = buildSegments(text);

  return (
    <div className={`leading-relaxed ${className}`}>
      {segments.map((seg, i) =>
        seg.mono ? (
          <pre
            key={i}
            className="font-mono text-sm whitespace-pre-wrap overflow-x-auto my-1"
          >
            <RichText text={seg.text} />
          </pre>
        ) : (
          <span
            key={i}
            className="whitespace-pre-wrap"
          >
            <RichText text={seg.text} />
          </span>
        )
      )}
    </div>
  );
}
