import { ai, EMBEDDING_MODEL } from './gemini';

// Task type strings for the new @google/genai SDK
const TASK_RETRIEVAL_DOCUMENT = 'RETRIEVAL_DOCUMENT';
const TASK_RETRIEVAL_QUERY = 'RETRIEVAL_QUERY';

export type EmbedTaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

export async function embedText(
  text: string,
  taskType: EmbedTaskType = 'RETRIEVAL_DOCUMENT'
): Promise<number[]> {
  const result = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: {
      taskType,
      outputDimensionality: 768,
    },
  });

  const values = result.embeddings?.[0]?.values;
  if (!values || values.length === 0) {
    throw new Error('Failed to generate embedding from Gemini API');
  }

  return values;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  for (const text of texts) {
    const embedding = await embedText(text, TASK_RETRIEVAL_DOCUMENT as EmbedTaskType);
    embeddings.push(embedding);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return embeddings;
}
