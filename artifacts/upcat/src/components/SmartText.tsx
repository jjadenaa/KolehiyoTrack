import { useRef, useEffect } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * SmartText renders body text in standard responsive typography.
 * It automatically parses Markdown tables into styled HTML <table> elements (without monospace),
 * while preserving KaTeX math ($...$, $$...$$) and bold formatting (**...**).
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

function isSeparatorLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return /^\|?[\s\-+=:|]+\|?$/.test(trimmed) && (trimmed.includes('-') || trimmed.includes('='));
}

function isTableLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.includes('|')) return true;
  return false;
}

function isDiagramLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  // Box-drawing characters or non-table ASCII diagrams
  if (/[│─┌┐└┘├┤┬┴┼╔╗╚╝║═▲▼◄►]/.test(trimmed)) return true;
  if (/^[\s+\-=/\\*]{5,}$/.test(trimmed)) return true;
  return false;
}

interface TableBlock {
  type: 'table';
  headers: string[];
  rows: string[][];
}

interface MonoBlock {
  type: 'mono';
  text: string;
}

interface TextBlock {
  type: 'text';
  text: string;
}

type ContentBlock = TableBlock | MonoBlock | TextBlock;

function parseTableLines(lines: string[]): { headers: string[]; rows: string[][] } | null {
  const dataLines = lines.filter(l => !isSeparatorLine(l) && l.trim().length > 0);
  if (dataLines.length === 0) return null;

  const parsedRows: string[][] = [];
  for (const line of dataLines) {
    let raw = line.trim();
    if (raw.startsWith('|')) raw = raw.slice(1);
    if (raw.endsWith('|')) raw = raw.slice(0, -1);
    const cells = raw.split('|').map(c => c.trim());
    if (cells.length >= 1) {
      parsedRows.push(cells);
    }
  }

  if (parsedRows.length === 0) return null;

  const headers = parsedRows[0];
  const rows = parsedRows.slice(1);

  return { headers, rows };
}

function parseContentBlocks(text: string): ContentBlock[] {
  const lines = text.split("\n");
  const blocks: ContentBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 1. Check for Table block (must contain a separator line like |---|---|)
    if (isTableLine(line)) {
      let j = i;
      const candidateLines: string[] = [];
      let hasSeparator = false;
      while (j < lines.length && (isTableLine(lines[j]) || isSeparatorLine(lines[j]))) {
        if (isSeparatorLine(lines[j])) {
          hasSeparator = true;
        }
        candidateLines.push(lines[j]);
        j++;
      }

      if (hasSeparator) {
        const parsedTable = parseTableLines(candidateLines);
        if (parsedTable && (parsedTable.headers.length > 0)) {
          blocks.push({
            type: 'table',
            headers: parsedTable.headers,
            rows: parsedTable.rows
          });
          i = j;
          continue;
        }
      }
    }

    // 2. Check for Mono/Diagram block
    if (isDiagramLine(line)) {
      const monoLines: string[] = [];
      while (i < lines.length && isDiagramLine(lines[i])) {
        monoLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'mono', text: monoLines.join("\n") });
      continue;
    }

    // 3. Normal text block
    const textLines: string[] = [];
    while (
      i < lines.length &&
      !(isTableLine(lines[i]) && lines.slice(i).some((l, idx) => {
        let k = i;
        let foundSep = false;
        while (k < lines.length && (isTableLine(lines[k]) || isSeparatorLine(lines[k]))) {
          if (isSeparatorLine(lines[k])) foundSep = true;
          k++;
        }
        return foundSep;
      })) &&
      !isDiagramLine(lines[i])
    ) {
      textLines.push(lines[i]);
      i++;
    }
    if (textLines.length > 0) {
      blocks.push({ type: 'text', text: textLines.join("\n") });
    }
  }

  return blocks;
}

/**
 * Helper to determine if a string looks like a valid inline math formula,
 * as opposed to regular text containing currency or punctuation.
 */
function isLatexString(str: string): boolean {
  return /\\[a-zA-Z]+|\^|_|√|÷|×|°/.test(str);
}

/**
 * Helper to determine if a string inside $...$ looks like a valid inline math formula,
 * as opposed to regular text containing currency or punctuation.
 */
function isValidMath(math: string): boolean {
  if (math.includes('\n')) return false;
  if (isLatexString(math)) return true;

  const words = math.toLowerCase().split(/\s+/);
  const commonWords = [
    'the', 'and', 'with', 'to', 'buy', 'for', 'was', 'she', 'had', 'been', 
    'you', 'your', 'this', 'that', 'of', 'is', 'in', 'it', 'on', 'he', 
    'his', 'her', 'they', 'at', 'be', 'or', 'an', 'but', 'my', 'him',
    'only', 'from', 'about', 'would', 'should', 'could', 'which', 'who', 'whom',
    'tomorrow', 'present', 'cents', 'dollars', 'money', 'price', 'cost'
  ];
  return !words.some(w => commonWords.includes(w));
}

/**
 * Renders text with **bold** markers as <strong> elements, and math inside $...$ or $$...$$ using KaTeX.
 * Also automatically handles unenclosed LaTeX math constructs like \frac{}, \sqrt{}, \Rightarrow, \times, etc.
 */
function RichText({ text }: { text: string }) {
  // 1. Split by display math $$...$$ and inline math $...$
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^\s$](?:[^\$\n]*?[^\s$])?\$)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const math = part.slice(2, -2).replace(/^\$+|\$+$/g, '').trim();
          return <MathElement key={i} math={math} displayMode={true} />;
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1).replace(/^\$+|\$+$/g, '').trim();
          if (isValidMath(math)) {
            return <MathElement key={i} math={math} displayMode={false} />;
          }
          // If not valid math (e.g., $50), preserve original string with $
          return <span key={i}>{part}</span>;
        }

        // If part contains bare LaTeX commands (e.g. \frac{a}{b}, \sqrt{x}, \Rightarrow, \times, \text{...})
        // split by LaTeX math expressions or bold tags
        const latexSegments = part.split(/(\\[a-zA-Z]+(?:\{[^{}]*\}|\s*[\d\w_^+=-]*)*)/g);

        return (
          <span key={i}>
            {latexSegments.map((seg, k) => {
              if (seg.startsWith('\\') && isLatexString(seg)) {
                return <MathElement key={k} math={seg} displayMode={false} />;
              }

              const boldParts = seg.split(/(\*\*[\s\S]*?\*\*)/g);
              return (
                <span key={k}>
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
  const blocks = parseContentBlocks(text);

  return (
    <div className={`leading-relaxed ${className}`}>
      {blocks.map((block, i) => {
        if (block.type === 'table') {
          return (
            <div key={i} className="my-4 overflow-x-auto rounded-lg border border-border/60 shadow-xs bg-card">
              <table className="w-full text-sm border-collapse text-left">
                <thead className="bg-muted/80 text-foreground font-bold border-b border-border/60">
                  <tr>
                    {block.headers.map((h, idx) => (
                      <th key={idx} className="p-3 px-4 font-bold border-r last:border-r-0 border-border/40">
                        <RichText text={h} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {block.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-muted/30 transition-colors">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="p-2.5 px-4 border-r last:border-r-0 border-border/30 text-foreground/90">
                          <RichText text={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (block.type === 'mono') {
          return (
            <pre
              key={i}
              className="font-mono text-xs whitespace-pre-wrap overflow-x-auto my-2 p-3 bg-muted/30 border border-border/50 rounded-lg"
            >
              <RichText text={block.text} />
            </pre>
          );
        }

        return (
          <span key={i} className="whitespace-pre-wrap">
            <RichText text={block.text} />
          </span>
        );
      })}
    </div>
  );
}

