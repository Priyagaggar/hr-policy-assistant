import { NextRequest, NextResponse } from 'next/server';
import { getPineconeIndex } from '@/lib/pinecone';

/**
 * GET /api/document?filename=FILENAME
 *
 * Fetches the file manifest record from Pinecone and serves
 * the original uploaded document as a downloadable binary response.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json({ error: 'filename query parameter is required' }, { status: 400 });
    }

    const indexInstance = getPineconeIndex();

    // Fetch the manifest record by its deterministic ID
    const manifestId = `__manifest__${filename}`;
    const fetchResponse = await indexInstance.fetch({ ids: [manifestId] });

    const record = fetchResponse.records?.[manifestId];

    if (!record || !record.metadata?.base64Content) {
      return new NextResponse(
        `Document "${filename}" not found. It may not have been uploaded yet, or may need to be re-uploaded.`,
        { status: 404, headers: { 'Content-Type': 'text/plain' } }
      );
    }

    const base64Content = record.metadata.base64Content as string;
    const mimeType = (record.metadata.mimeType as string) || 'application/octet-stream';
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
