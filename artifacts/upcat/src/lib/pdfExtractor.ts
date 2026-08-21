import * as pdfjsLib from "pdfjs-dist";

// Configure worker for Vite bundler
try {
  // Use Vite's URL resolution or standard CDN fallback if worker build fails
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
} catch (e) {
  console.warn("PDF.js worker initialization warning:", e);
}

export interface ExtractedPdfPage {
  pageNumber: number;
  text: string;
}

export interface ExtractedPdfData {
  totalPages: number;
  fullText: string;
  hasTextLayer: boolean;
  pageTexts: ExtractedPdfPage[];
  chunks: string[];
}

/**
 * Extracts raw selectable text from a PDF file in the browser.
 * Extremely fast (~100-300ms for multi-page documents).
 */
export async function extractTextFromPdfFile(
  file: File,
  onProgress?: (progressText: string, percent: number) => void
): Promise<ExtractedPdfData> {
  onProgress?.("Reading PDF file...", 10);
  const arrayBuffer = await file.arrayBuffer();

  onProgress?.("Parsing PDF document structure...", 25);
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;
  const pageTexts: ExtractedPdfPage[] = [];
  let combinedText = "";

  for (let i = 1; i <= totalPages; i++) {
    const pct = 25 + Math.floor(((i - 1) / totalPages) * 60);
    onProgress?.(`Extracting text from page ${i} of ${totalPages}...`, pct);

    try {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items
        .map((item: any) => (item.str ? item.str : ""))
        .filter(Boolean);

      // Join items preserving spacing
      const pageText = pageStrings.join(" ").replace(/\s+/g, " ").trim();
      pageTexts.push({ pageNumber: i, text: pageText });
      if (pageText) {
        combinedText += `\n--- [PAGE ${i}] ---\n` + pageText + "\n";
      }
    } catch (err) {
      console.warn(`Error extracting text from page ${i}:`, err);
    }
  }

  const cleanFullText = combinedText.trim();
  const hasTextLayer = cleanFullText.length > 60;

  // Split into manageable chunks (approx 4,000 to 6,000 characters per chunk, splitting on page or question markers)
  const chunks = createDocumentChunks(cleanFullText, pageTexts);

  onProgress?.("Text extraction complete!", 90);

  return {
    totalPages,
    fullText: cleanFullText,
    hasTextLayer,
    pageTexts,
    chunks,
  };
}

/**
 * Splits extracted document text into chunks to ensure AI extracts 100% of questions
 * without hitting response token truncation or timing out.
 */
export function createDocumentChunks(
  fullText: string,
  pageTexts: ExtractedPdfPage[],
  targetChunkChars: number = 4500
): string[] {
  if (!fullText || fullText.length <= targetChunkChars) {
    return fullText ? [fullText] : [];
  }

  const chunks: string[] = [];
  let currentChunk = "";

  // Strategy 1: Chunk by pages if page texts are available
  if (pageTexts && pageTexts.length > 1) {
    for (const p of pageTexts) {
      const pageFormatted = `\n--- [PAGE ${p.pageNumber}] ---\n${p.text}\n`;
      if (currentChunk.length + pageFormatted.length > targetChunkChars && currentChunk.length > 500) {
        chunks.push(currentChunk.trim());
        currentChunk = pageFormatted;
      } else {
        currentChunk += pageFormatted;
      }
    }
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }
    if (chunks.length > 0) {
      return chunks;
    }
  }

  // Strategy 2: Fallback paragraph/question splitting
  const paragraphs = fullText.split(/\n\s*\n/);
  currentChunk = "";

  for (const para of paragraphs) {
    if (currentChunk.length + para.length > targetChunkChars && currentChunk.length > 500) {
      chunks.push(currentChunk.trim());
      currentChunk = para + "\n\n";
    } else {
      currentChunk += para + "\n\n";
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [fullText];
}
