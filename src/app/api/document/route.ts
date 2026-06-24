import { NextRequest, NextResponse } from 'next/server';
import { getPineconeIndex } from '@/lib/pinecone';
import { embedText } from '@/lib/embeddings';
import { TaskType } from '@google/generative-ai';

/**
 * GET /api/document?filename=FILENAME
 *
 * Looks up the Vercel Blob URL stored in the first chunk's metadata
 * and redirects the browser to it for download.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json(
        { error: 'filename query parameter is required' },
        { status: 400 }
      );
    }

    const indexInstance = getPineconeIndex();

    // Query for the first chunk of this file which holds the blobUrl
    const queryEmbedding = await embedText(filename, TaskType.RETRIEVAL_QUERY);
    const queryResponse = await indexInstance.query({
      vector: queryEmbedding,
      topK: 1,
      includeMetadata: true,
      filter: {
        filename: { $eq: filename },
        chunkIndex: { $eq: 0 },
      },
    });

    const blobUrl = queryResponse.matches?.[0]?.metadata?.blobUrl as string | undefined;

    if (!blobUrl) {
      return new NextResponse(
        `Document "${filename}" not found. Please re-upload it from the Admin panel.`,
        { status: 404, headers: { 'Content-Type': 'text/plain' } }
      );
    }

    // Redirect directly to the public Vercel Blob URL
    return NextResponse.redirect(blobUrl);
  } catch (error: any) {
    console.error('Document fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
