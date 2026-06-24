import { embeddingModel } from './gemini';
import { TaskType } from '@google/generative-ai';

export async function embedText(
  text: string,
  taskType: TaskType = TaskType.RETRIEVAL_DOCUMENT
): Promise<number[]> {
  const result = await embeddingModel.embedContent({
    content: { role: 'user', parts: [{ text }] },
    taskType,
    outputDimensionality: 768,
  } as any);
  
  if (!result || !result.embedding || !result.embedding.values) {
    throw new Error('Failed to generate embedding from Gemini API');
  }
  
  return result.embedding.values;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  for (const text of texts) {
    const embedding = await embedText(text, TaskType.RETRIEVAL_DOCUMENT);
    embeddings.push(embedding);
    // 100ms delay to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return embeddings;
}
