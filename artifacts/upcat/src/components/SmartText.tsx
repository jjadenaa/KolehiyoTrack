import React, { useRef, useEffect } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * SmartText renders body text, AI outputs, and question explanations in responsive,
 * clean typography with comprehensive Markdown and KaTeX math support.
 *
 * Supported features:
 * - KaTeX math: $...$, $$...$$, \(...\), \[...\], bare LaTeX commands (\frac, \sqrt, etc.)
 * - Markdown headings: #, ##, ###, ####, etc.
 * - Horizontal rules: ---, ***, ___
 * - Lists: Ordered (1., 2.), unordered (*, -, +, •), and indented sub-bullets
 * - Tables: Markdown tables parsed into styled HTML <table>
 * - Blockquotes: > quote
 * - Code blocks: ```language ... ```
 * - Inline formatting: **bold**, *italic*, `inline code`
 * - Diagram blocks / ASCII art
 */

function MathElement({ math, displayMode }: { math: string; displayMode: boolean }) {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(math, containerRef.current, {
          displayMode,
          throwOnError: false,
          errorColor: '#f87171',
          output: 'htmlAndMathml',
          trust: true,
          strict: false,
        });
      } catch (e) {
        if (containerRef.current) {
          containerRef.current.textContent = math;
        }
      }
    }
  }, [math, displayMode]);

  return (
    <span
      ref={containerRef}
      className={
        displayMode
          ? "block my-2 text-center overflow-x-auto py-1.5 text-foreground max-w-full [scrollbar-width:thin]"
          : "inline-block px-1 align-baseline text-foreground font-serif"
      }
    />
  );
}

function isSeparatorLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return /^\|?[\s\-+=:|]+\|?$/.test(trimmed) && (trimmed.includes('-') || trimmed.includes('='));
}

function isTableLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return trimmed.includes('|');
}

function isDiagramLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/[│─┌┐└┘├┤┬┴┼╔╗╚╝║═▲▼◄►]/.test(trimmed)) return true;
  if (/^[\s+\-=/\\*]{6,}$/.test(trimmed)) return true;
  return false;
}

function isHorizontalRule(line: string): boolean {
  const trimmed = line.trim();
  return /^(---|___|\*\*\*)$/.test(trimmed);
}

function isHeadingLine(line: string): { level: number; text: string } | null {
  const match = line.match(/^(#{1,6})\s+(.+)$/);
  if (match) {
    return { level: match[1].length, text: match[2].trim() };
  }
  return null;
}

function isBlockquoteLine(line: string): boolean {
  return /^>\s?/.test(line.trim());
}

interface ParsedListItem {
  text: string;
  isSub: boolean;
  prefix?: string;
  ordered: boolean;
}

function parseListLine(line: string): ParsedListItem | null {
  // Check bullet list: * , - , + , •
  const bulletMatch = line.match(/^(\s*)([-*+•])\s+(.+)$/);
  if (bulletMatch) {
    const indent = bulletMatch[1].length;
    return {
      text: bulletMatch[3].trim(),
      isSub: indent >= 2,
      ordered: false,
    };
  }

  // Check numbered list: 1. , 1) , (1) , I. , A.
  const orderedMatch = line.match(/^(\s*)(\d+|[A-Za-z]|[IVXLCDM]+)[.)]\s+(.+)$/);
  if (orderedMatch) {
    const indent = orderedMatch[1].length;
    return {
      text: orderedMatch[3].trim(),
      isSub: indent >= 2,
      prefix: `${orderedMatch[2]}.`,
      ordered: true,
    };
  }

  return null;
}

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

type ContentBlock =
  | { type: 'hr' }
  | { type: 'heading'; level: number; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'code'; language: string; code: string }
  | { type: 'blockquote'; text: string }
  | { type: 'list'; items: ParsedListItem[] }
  | { type: 'display-math'; math: string }
  | { type: 'mono'; text: string }
  | { type: 'paragraph'; text: string };

function parseContentBlocks(text: string): ContentBlock[] {
  const lines = text.split("\n");
  const blocks: ContentBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Skip empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // 1. Code Block (```lang)
    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing ```
      blocks.push({ type: 'code', language, code: codeLines.join("\n") });
      continue;
    }

    // 2. Display Math Block ($$ ... $$ or \[ ... \])
    if (trimmed === '$$' || (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 4)) {
      if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 4) {
        blocks.push({ type: 'display-math', math: trimmed.slice(2, -2).trim() });
        i++;
        continue;
      } else {
        const mathLines: string[] = [];
        i++;
        while (i < lines.length && lines[i].trim() !== '$$') {
          mathLines.push(lines[i]);
          i++;
        }
        if (i < lines.length) i++; // skip closing $$
        blocks.push({ type: 'display-math', math: mathLines.join("\n").trim() });
        continue;
      }
    }

    // 3. Horizontal Rule (---, ***, ___)
    if (isHorizontalRule(trimmed)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // 4. Heading (# H1, ## H2, ### H3, ...)
    const heading = isHeadingLine(trimmed);
    if (heading) {
      blocks.push({ type: 'heading', level: heading.level, text: heading.text });
      i++;
      continue;
    }

    // 5. Blockquote (> ...)
    if (isBlockquoteLine(rawLine)) {
      const quoteLines: string[] = [];
      while (i < lines.length && isBlockquoteLine(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ type: 'blockquote', text: quoteLines.join("\n") });
      continue;
    }

    // 6. Markdown Table
    if (isTableLine(rawLine)) {
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
        if (parsedTable && parsedTable.headers.length > 0) {
          blocks.push({
            type: 'table',
            headers: parsedTable.headers,
            rows: parsedTable.rows,
          });
          i = j;
          continue;
        }
      }
    }

    // 7. Diagram / ASCII Art
    if (isDiagramLine(rawLine)) {
      const monoLines: string[] = [];
      while (i < lines.length && isDiagramLine(lines[i])) {
        monoLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'mono', text: monoLines.join("\n") });
      continue;
    }

    // 8. List Items (*, -, 1., etc.)
    const listItem = parseListLine(rawLine);
    if (listItem) {
      const items: ParsedListItem[] = [listItem];
      i++;
      while (i < lines.length) {
        const nextItem = parseListLine(lines[i]);
        if (nextItem) {
          items.push(nextItem);
          i++;
        } else if (lines[i].startsWith("   ") || lines[i].startsWith("\t")) {
          // Continuation line of previous list item
          items[items.length - 1].text += " " + lines[i].trim();
          i++;
        } else {
          break;
        }
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    // 9. Standard Paragraph
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !isHorizontalRule(lines[i]) &&
      !isHeadingLine(lines[i]) &&
      !isBlockquoteLine(lines[i]) &&
      !parseListLine(lines[i]) &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('$$') &&
      !isDiagramLine(lines[i]) &&
      !(isTableLine(lines[i]) && lines.slice(i).some((l) => isSeparatorLine(l)))
    ) {
      paraLines.push(lines[i]);
      i++;
    }

    if (paraLines.length > 0) {
      blocks.push({ type: 'paragraph', text: paraLines.join("\n") });
    } else {
      i++;
    }
  }

  return blocks;
}

function isLatexString(str: string): boolean {
  return /\\[a-zA-Z]+|\^|_|√|÷|×|°|≤|≥|≠|±|≈|\+|-|\*|\/|=|<|>/.test(str);
}

function isValidMath(math: string): boolean {
  if (!math || !math.trim()) return false;
  // If it's a monetary value like $50 or $1,000, reject as math
  if (/^\s*\$?\d+([.,]\d+)*\s*$/.test(math)) return false;
  if (isLatexString(math)) return true;

  const words = math.toLowerCase().split(/\s+/);
  const commonWords = [
    'the', 'and', 'with', 'to', 'buy', 'for', 'was', 'she', 'had', 'been',
    'you', 'your', 'this', 'that', 'of', 'is', 'in', 'it', 'on', 'he',
    'his', 'her', 'they', 'at', 'be', 'or', 'an', 'but', 'my', 'him',
    'tomorrow', 'present', 'cents', 'dollars', 'money', 'price', 'cost'
  ];
  return !words.some(w => commonWords.includes(w));
}

/**
 * Renders inline text containing:
 * - Math ($...$, $$...$$, \(...\), \[...\], bare LaTeX)
 * - Bold (**...**)
 * - Italic (*...* or _..._)
 * - Inline code (`...`)
 */
function RichText({ text }: { text: string }) {
  if (!text) return null;

  // Split by LaTeX math environments ($$...$$, \[...\], $...$, \(...\))
  const mathRegex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^\s$](?:[^\$\n]*?[^\s$])?\$|\\\([\s\S]*?\\\))/g;
  const parts = text.split(mathRegex);

  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;

        // Display math $$...$$
        if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
          const math = part.slice(2, -2).trim();
          return <MathElement key={i} math={math} displayMode={true} />;
        }

        // Display math \[...\]
        if (part.startsWith('\\[') && part.endsWith('\\]') && part.length > 4) {
          const math = part.slice(2, -2).trim();
          return <MathElement key={i} math={math} displayMode={true} />;
        }

        // Inline math \(...\)
        if (part.startsWith('\\(') && part.endsWith('\\)') && part.length > 4) {
          const math = part.slice(2, -2).trim();
          return <MathElement key={i} math={math} displayMode={false} />;
        }

        // Inline math $...$
        if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          const math = part.slice(1, -1).trim();
          if (isValidMath(math)) {
            return <MathElement key={i} math={math} displayMode={false} />;
          }
          return <span key={i}>{part}</span>;
        }

        // Parse bare LaTeX, inline code, bold, and italic in regular text segments
        return <InlineFormattedText key={i} text={part} />;
      })}
    </>
  );
}

function InlineFormattedText({ text }: { text: string }) {
  // 1. Check for inline code `code`
  const codeParts = text.split(/(`[^`]+`)/g);

  return (
    <>
      {codeParts.map((cPart, cIdx) => {
        if (cPart.startsWith('`') && cPart.endsWith('`') && cPart.length > 2) {
          return (
            <code
              key={cIdx}
              className="px-1.5 py-0.5 mx-0.5 text-[0.88em] font-mono bg-muted/70 text-primary border border-border/60 rounded"
            >
              {cPart.slice(1, -1)}
            </code>
          );
        }

        // 2. Bare LaTeX macros (e.g. \frac{a}{b}, \sqrt{25}, \times, \pm)
        const latexSegments = cPart.split(/(\\[a-zA-Z]+(?:\{[^{}]*\}|\s*[\d\w_^+=-]*)*)/g);

        return (
          <React.Fragment key={cIdx}>
            {latexSegments.map((seg, sIdx) => {
              if (seg.startsWith('\\') && isLatexString(seg)) {
                return <MathElement key={sIdx} math={seg} displayMode={false} />;
              }

              // 3. Bold text (**...** or __...__)
              const boldParts = seg.split(/(\*\*[^*]+\*\*|__[^_]+__)/g);

              return (
                <React.Fragment key={sIdx}>
                  {boldParts.map((bPart, bIdx) => {
                    if (
                      (bPart.startsWith('**') && bPart.endsWith('**') && bPart.length > 4) ||
                      (bPart.startsWith('__') && bPart.endsWith('__') && bPart.length > 4)
                    ) {
                      const inner = bPart.slice(2, -2);
                      return (
                        <strong key={bIdx} className="font-semibold text-foreground">
                          {inner}
                        </strong>
                      );
                    }

                    // 4. Italic (*...* or _..._)
                    const italicParts = bPart.split(/(?<!\*)\*([^*]+)\*(?!\*)|(?<!_)_([^_]+)_(?!_)/g);
                    if (italicParts.length > 1) {
                      return (
                        <React.Fragment key={bIdx}>
                          {italicParts.map((itPart, itIdx) => {
                            if (itPart === undefined) return null;
                            if (itIdx % 2 === 1) {
                              return <em key={itIdx} className="italic text-foreground/90">{itPart}</em>;
                            }
                            return <span key={itIdx}>{itPart}</span>;
                          })}
                        </React.Fragment>
                      );
                    }

                    return <span key={bIdx}>{bPart}</span>;
                  })}
                </React.Fragment>
              );
            })}
          </React.Fragment>
        );
      })}
    </>
  );
}

export interface SmartTextProps {
  text: string;
  className?: string;
}

export function SmartText({ text, className = "" }: SmartTextProps) {
  if (!text) return null;

  const blocks = parseContentBlocks(text);

  return (
    <div className={`space-y-2.5 leading-relaxed text-foreground font-sans ${className}`}>
      {blocks.map((block, i) => {
        // Horizontal Rule
        if (block.type === 'hr') {
          return <hr key={i} className="my-3 border-t border-border/80" />;
        }

        // Headings
        if (block.type === 'heading') {
          if (block.level === 1) {
            return (
              <h1 key={i} className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground mt-4 mb-2 pb-1 border-b border-border/50">
                <RichText text={block.text} />
              </h1>
            );
          }
          if (block.level === 2) {
            return (
              <h2 key={i} className="text-lg sm:text-xl font-bold tracking-tight text-foreground mt-3.5 mb-1.5">
                <RichText text={block.text} />
              </h2>
            );
          }
          if (block.level === 3) {
            return (
              <h3 key={i} className="text-base sm:text-lg font-bold tracking-tight text-foreground mt-3 mb-1.5 flex items-center gap-1.5">
                <RichText text={block.text} />
              </h3>
            );
          }
          return (
            <h4 key={i} className="text-sm sm:text-base font-semibold text-foreground mt-2 mb-1">
              <RichText text={block.text} />
            </h4>
          );
        }

        // Code Block
        if (block.type === 'code') {
          return (
            <div key={i} className="my-2.5 rounded-lg overflow-hidden border border-border/70 bg-muted/40 shadow-2xs">
              {block.language && (
                <div className="px-3 py-1 text-[11px] font-mono text-muted-foreground bg-muted/60 border-b border-border/40 uppercase tracking-wider font-semibold">
                  {block.language}
                </div>
              )}
              <pre className="p-3 font-mono text-xs overflow-x-auto whitespace-pre leading-relaxed text-foreground/90">
                <code>{block.code}</code>
              </pre>
            </div>
          );
        }

        // Display Math Block
        if (block.type === 'display-math') {
          return (
            <div key={i} className="my-2 overflow-x-auto p-2 bg-muted/20 border border-border/40 rounded-lg">
              <MathElement math={block.math} displayMode={true} />
            </div>
          );
        }

        // Blockquote
        if (block.type === 'blockquote') {
          return (
            <blockquote key={i} className="border-l-4 border-primary/70 pl-3.5 py-1.5 my-2.5 bg-primary/5 rounded-r-lg text-foreground/90 italic text-sm">
              <RichText text={block.text} />
            </blockquote>
          );
        }

        // List
        if (block.type === 'list') {
          return (
            <div key={i} className="my-2 space-y-1.5 text-sm">
              {block.items.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2.5 ${item.isSub ? "ml-5 text-[13.5px] text-foreground/90" : "text-foreground"}`}
                >
                  {item.prefix ? (
                    <span className="font-bold text-primary shrink-0 min-w-[1.25rem] text-xs mt-0.5">
                      {item.prefix}
                    </span>
                  ) : (
                    <span className={`rounded-full shrink-0 mt-2 ${item.isSub ? "h-1 w-1 bg-muted-foreground" : "h-1.5 w-1.5 bg-primary"}`} />
                  )}
                  <div className="flex-1 leading-relaxed">
                    <RichText text={item.text} />
                  </div>
                </div>
              ))}
            </div>
          );
        }

        // Markdown Table
        if (block.type === 'table') {
          return (
            <div key={i} className="my-3 overflow-x-auto rounded-lg border border-border/60 shadow-2xs bg-card">
              <table className="w-full text-sm border-collapse text-left">
                <thead className="bg-muted/80 text-foreground font-bold border-b border-border/60">
                  <tr>
                    {block.headers.map((h, idx) => (
                      <th key={idx} className="p-2.5 px-3.5 font-bold border-r last:border-r-0 border-border/40">
                        <RichText text={h} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {block.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-muted/30 transition-colors">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="p-2 px-3.5 border-r last:border-r-0 border-border/30 text-foreground/90">
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

        // Diagram / Monospace
        if (block.type === 'mono') {
          return (
            <pre
              key={i}
              className="font-mono text-xs whitespace-pre-wrap overflow-x-auto my-2 p-3 bg-muted/30 border border-border/50 rounded-lg text-foreground/90"
            >
              <RichText text={block.text} />
            </pre>
          );
        }

        // Paragraph
        return (
          <p key={i} className="leading-relaxed">
            <RichText text={block.text} />
          </p>
        );
      })}
    </div>
  );
}
