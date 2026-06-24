import { Chunk } from '../types';
import path from 'path';
import { pathToFileURL } from 'url';

export async function extractAndChunk(buffer: Buffer, filename: string): Promise<Chunk[]> {
  // Polyfill DOMMatrix BEFORE dynamically importing pdf-parse.
  // Static `import` statements are hoisted and evaluated before any code runs,
  // so placing a polyfill above them has no effect. Using a dynamic import()
  // inside the function ensures the polyfill is applied first.
  if (typeof global !== 'undefined' && !(global as any).DOMMatrix) {
    (global as any).DOMMatrix = class DOMMatrix {
      a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
      m11 = 1; m12 = 0; m13 = 0; m14 = 0;
      m21 = 0; m22 = 1; m23 = 0; m24 = 0;
      m31 = 0; m32 = 0; m33 = 1; m34 = 0;
      m41 = 0; m42 = 0; m43 = 0; m44 = 1;
      constructor(_init?: string | number[]) {}
      invertSelf() { return this; }
      multiplySelf() { return this; }
      translateSelf() { return this; }
      scaleSelf() { return this; }
      rotateSelf() { return this; }
    };
  }

  // Dynamic import AFTER polyfill is in place
  const { PDFParse } = await import('pdf-parse');

  const workerPath = path.resolve(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
  PDFParse.setWorker(pathToFileURL(workerPath).toString());
  const parser = new PDFParse({ data: buffer });
  const chunks: Chunk[] = [];

  try {
    const result = await parser.getText();
    const pages = result.pages; // Array of { text: string, num: number }

    for (const page of pages) {
      const pageNum = page.num;
      const text = page.text;
      if (!text) continue;

      // Split on ". "
      const sentences = text.split(/\. /g).map((s: string) => s.trim()).filter(Boolean);
      if (sentences.length === 0) continue;

      let currentChunkText = '';
      let lastSentenceOfPreviousChunk = '';
      let chunkIndex = 0;

      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];

        let candidate = '';
        if (!currentChunkText) {
          if (lastSentenceOfPreviousChunk) {
            candidate = lastSentenceOfPreviousChunk + '. ' + sentence;
          } else {
            candidate = sentence;
          }
        } else {
          candidate = currentChunkText + '. ' + sentence;
        }

        if (candidate.length <= 500) {
          currentChunkText = candidate;
        } else {
          if (currentChunkText) {
            const chunkSentences = currentChunkText.split(/\. /g);
            lastSentenceOfPreviousChunk = chunkSentences[chunkSentences.length - 1] || '';

            chunks.push({
              id: `${filename}-page${pageNum}-chunk${chunkIndex}`,
              text: currentChunkText,
              metadata: {
                filename,
                pageNumber: pageNum,
                chunkIndex
              }
            });
            chunkIndex++;
          }

          if (lastSentenceOfPreviousChunk) {
            const overlapCandidate = lastSentenceOfPreviousChunk + '. ' + sentence;
            if (overlapCandidate.length <= 500) {
              currentChunkText = overlapCandidate;
            } else {
              currentChunkText = sentence;
            }
          } else {
            currentChunkText = sentence;
          }
        }
      }

      // Push final chunk of the page
      if (currentChunkText) {
        chunks.push({
          id: `${filename}-page${pageNum}-chunk${chunkIndex}`,
          text: currentChunkText,
          metadata: {
            filename,
            pageNumber: pageNum,
            chunkIndex
          }
        });
      }
    }
  } finally {
    await parser.destroy();
  }

  return chunks;
}
