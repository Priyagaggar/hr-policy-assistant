import { NextRequest, NextResponse } from 'next/server';
import { getPineconeIndex } from '@/lib/pinecone';
import { embedText } from '@/lib/embeddings';
import { TaskType } from '@google/generative-ai';

/**
 * GET /api/document?filename=FILENAME
 *
 * Retrieves the original uploaded document and serves it as a download.
 * The base64-encoded file content is stored in the metadata of the
 * first chunk (chunkIndex === 0) for this filename in Pinecone.
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

    // Query Pinecone for the first chunk of this file which holds the base64Content.
    // We embed a simple query and filter by filename + chunkIndex === 0.
    // Since we only need metadata, we use a neutral embedding via a short query.
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

    const match = queryResponse.matches?.[0];

    if (!match || !match.metadata?.base64Content) {
      return new NextResponse(
        `Document "${filename}" not found. Please re-upload it from the Admin panel.`,
        { status: 404, headers: { 'Content-Type': 'text/plain' } }
      );
    }

    const base64Content = match.metadata.base64Content as string;
    const mimeType = (match.metadata.mimeType as string) || 'application/octet-stream';
    const fileBuffer = Buffer.from(base64Content, 'base64');

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('Document fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
