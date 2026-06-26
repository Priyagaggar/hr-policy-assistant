import { NextRequest, NextResponse } from 'next/server';
import { getPineconeIndex } from '@/lib/pinecone';
import { embedText, EmbedTaskType } from '@/lib/embeddings';
import Groq from 'groq-sdk';
import { Source } from '@/types';
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const CHAT_MODEL = 'llama-3.3-70b-versatile';


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question } = body;

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    // 1. Embed the user question
    const questionEmbedding = await embedText(question, 'RETRIEVAL_QUERY' as EmbedTaskType);

    // 2. Query Pinecone
    const index = getPineconeIndex();
    const queryResponse = await index.query({
      vector: questionEmbedding,
      topK: 15,
      includeMetadata: true,
      filter: { type: { $eq: 'chunk' } },
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
- When citing multiple sources for the same point, write them with a comma inside one bracket like "[2, 3]" — never write "[2][3]" or "[2] [3]".
- Do not place citation tags on every single line or word. Only place them at the end of key sentences, facts, or bullet points to reference where that information came from.
- IMPORTANT: At the end of your answer, add a "📄 Download Policy Document" section. Include download links ONLY for documents you actually cited in your answer using inline citations like [1], [2] etc. Do not include documents that were not cited. Format each link as: [Download Policy Document](/api/document?filename=FILENAME) where FILENAME is the exact filename. If only one document was cited, show only one link. Never show links for uncited documents.
- Do not make up information.

Policy Context Blocks:
${context || 'No matching policy documents found.'}

Employee Question: ${question}

Return your response as a JSON object with the following schema:
{
  "answer": "The text answer here including inline citations like [1] or [2]",
  "usedCitations": [1, 2] // Array of numbers representing the Context Block index numbers that you actually used in the answer (e.g. [1, 2]). If you could not find the answer, leave this array empty.
}`;

    // 7. Call Groq to generate answer
    const completion = await groq.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: 2048,
      response_format: { type: 'json_object' },
    });
    const result = { text: completion.choices[0].message.content ?? '' };

    let answer = 'I was unable to get a response from the service. Please try again.';
    let usedCitations: number[] = [];

    const rawContent = typeof result.text === 'string' ? result.text : '';
    // Strip markdown code fences (```json ... ```) that LLMs sometimes wrap around JSON
    const cleanContent = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    try {
      const parsed = JSON.parse(cleanContent);
      answer = parsed.answer || '';
      // Guard: LLM may return usedCitations as a number instead of array
      usedCitations = Array.isArray(parsed.usedCitations) ? parsed.usedCitations : [];
    } catch (e) {
      console.error('Failed to parse JSON response from Groq:', e);
      // Fallback in case JSON parsing fails
      answer = cleanContent;
      // Parse inline citation indices using regex
      const matchesIterator = answer.matchAll(/\[(\d+)\]/g);
      for (const m of matchesIterator) {
        const num = parseInt(m[1], 10);
        if (!usedCitations.includes(num)) {
          usedCitations.push(num);
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
