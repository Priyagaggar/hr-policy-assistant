import mammoth from 'mammoth';
import { Chunk } from '../types';

export async function extractAndChunkDocx(buffer: Buffer, filename: string): Promise<Chunk[]> {
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value;
  if (!text) return [];

  const sentences = text.split(/\. |\n+/g).map(s => s.trim()).filter(Boolean);
  if (sentences.length === 0) return [];

  const chunks: Chunk[] = [];
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

        // Estimate page number: roughly 3 chunks of 500 chars (1500 chars) per page
        const estimatedPage = Math.floor(chunkIndex / 3) + 1;

        chunks.push({
          id: `${filename}-page${estimatedPage}-chunk${chunkIndex}`,
          text: currentChunkText,
          metadata: {
            filename,
            pageNumber: estimatedPage,
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

  if (currentChunkText) {
    const estimatedPage = Math.floor(chunkIndex / 3) + 1;
    chunks.push({
      id: `${filename}-page${estimatedPage}-chunk${chunkIndex}`,
      text: currentChunkText,
      metadata: {
        filename,
        pageNumber: estimatedPage,
        chunkIndex
      }
    });
  }

  return chunks;
}
