import { PDFParse } from 'pdf-parse';
import { Chunk } from '../types';

import path from 'path';
import { pathToFileURL } from 'url';

export async function extractAndChunk(buffer: Buffer, filename: string): Promise<Chunk[]> {
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
      const sentences = text.split(/\. /g).map(s => s.trim()).filter(Boolean);
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
          // Save current chunk if it has content
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

          // Start new chunk with current sentence (prepending the overlap sentence if possible)
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
