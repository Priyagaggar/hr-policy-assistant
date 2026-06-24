import { NextRequest, NextResponse } from 'next/server';
import { getPineconeIndex } from '@/lib/pinecone';
import { embedText } from '@/lib/embeddings';
import { geminiModel } from '@/lib/gemini';
import { TaskType } from '@google/generative-ai';
import { Source } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question } = body;

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    // 1. Embed the user question
    const questionEmbedding = await embedText(question, TaskType.RETRIEVAL_QUERY);

    // 2. Query Pinecone
    const index = getPineconeIndex();
    const queryResponse = await index.query({
      vector: questionEmbedding,
      topK: 15,
      includeMetadata: true,
    });

    // 3. Extract matches & filter out any with score below 0.55
    const matches = (queryResponse.matches || []).filter(
      (match) => match.score !== undefined && match.score >= 0.55
    );

    // 4. Build context string and map matches to indices
    let context = '';
    const contextMap = new Map<number, { filename: string; pageNumber: number; text: string }>();
    matches.forEach((match, idx) => {
      const indexNum = idx + 1;
      const metadata = match.metadata as any;
      if (metadata) {
        context += `Context Block [${indexNum}] (from ${metadata.filename}, page ${metadata.pageNumber}):\n${metadata.text}\n---\n\n`;
        contextMap.set(indexNum, {
          filename: metadata.filename,
          pageNumber: Number(metadata.pageNumber) || 1,
          text: metadata.text || ''
        });
      }
    });

    // 5. Build prompt requesting structured output with inline citations
    const prompt = `You are an HR Policy Assistant for a company. Answer the employee's question 
based ONLY on the policy documents provided below. 

Rules:
- Answer only from the provided context blocks.
- If the answer is not in the context, output exactly "I could not find information about this in the available policy documents. Please contact HR directly." as the answer.
- Structure your answer comprehensively using multiple paragraphs, clear headings, or bullet points. Avoid writing a single, overly short block of text.
- Insert inline citations in your answer like "[1]", "[2]", "[3]" etc. representing the Context Block index that supports the preceding sentence, fact, or completed point.
- Do not place citation tags on every single line or word. Only place them at the end of key sentences, facts, or bullet points to reference where that information came from.
- If the employee asks to download, view, open, or get the original PDF, document, or policy file, provide a direct download link using the path "/api/document?filename=" followed by the exact filename of the document (e.g. "[Download Document](/api/document?filename=FILENAME)" or "[View PDF](/api/document?filename=FILENAME)"). Only provide download links for files that are explicitly present in the provided context blocks.
- Do not make up information.

Policy Context Blocks:
${context || 'No matching policy documents found.'}

Employee Question: ${question}

Return your response as a JSON object with the following schema:
{
  "answer": "The text answer here including inline citations like [1] or [2]",
  "usedCitations": [1, 2] // Array of numbers representing the Context Block index numbers that you actually used in the answer (e.g. [1, 2]). If you could not find the answer, leave this array empty.
}
`;

    // 7. Call Gemini to generate answer with retry mechanism and JSON response type
    let result;
    const maxRetries = 3;
    let backoffDelay = 1000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        result = await geminiModel.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        });
        break; // Success, break retry loop
      } catch (err: any) {
        const errorMsg = err.message || '';
        const isTransient = errorMsg.includes('503') || errorMsg.includes('429') || errorMsg.includes('Service Unavailable') || errorMsg.includes('Too Many Requests');
        
        if (attempt < maxRetries && isTransient) {
          console.warn(`Gemini API transient error (attempt ${attempt}/${maxRetries}): ${errorMsg}. Retrying in ${backoffDelay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
          backoffDelay *= 2;
        } else {
          throw err;
        }
      }
    }

    let answer = 'I was unable to get a response from the service. Please try again.';
    let usedCitations: number[] = [];

    if (result) {
      try {
        const text = result.response.text();
        const parsed = JSON.parse(text);
        answer = parsed.answer || '';
        usedCitations = parsed.usedCitations || [];
      } catch (e) {
        console.error('Failed to parse JSON response from Gemini:', e);
        // Fallback in case JSON parsing fails
        answer = result.response.text();
        // Parse indices using regex if JSON failed
        const matchesIterator = answer.matchAll(/\[(\d+)\]/g);
        for (const m of matchesIterator) {
          const num = parseInt(m[1], 10);
          if (!usedCitations.includes(num)) {
            usedCitations.push(num);
          }
        }
      }
    }

    // Map usedCitations to the final sources array
    let finalSources = usedCitations.map(idx => {
      const block = contextMap.get(idx);
      if (block) {
        return {
          index: idx,
          filename: block.filename,
          pageNumber: block.pageNumber,
          excerpt: block.text
        };
      }
      return null;
    }).filter((s): s is NonNullable<typeof s> => s !== null);

    // Sort by index so references list at bottom is ordered [1], [2], [3]...
    finalSources.sort((a, b) => a.index - b.index);

    // If the chatbot couldn't find relevant info, double check to clear sources
    const isFallback = answer.includes("I could not find information") || 
                       answer.includes("Please contact HR directly") || 
                       answer.includes("unable to get a response");

    if (isFallback) {
      finalSources = [];
    }

    return NextResponse.json({
      answer,
      sources: finalSources,
    });
  } catch (error: any) {
    console.error('Chat endpoint error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
