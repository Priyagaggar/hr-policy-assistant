import { NextRequest, NextResponse } from 'next/server';
import { extractAndChunk } from '@/lib/pdf-parser';
import { extractAndChunkDocx } from '@/lib/docx-parser';
import { embedBatch } from '@/lib/embeddings';
import { getPineconeIndex } from '@/lib/pinecone';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const nameLower = file.name.toLowerCase();
    const isPdf = nameLower.endsWith('.pdf');
    const isDocx = nameLower.endsWith('.docx');

    if (!isPdf && !isDocx) {
      return NextResponse.json({ error: 'Only PDF and DOCX files are supported' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = file.name;

    // Parse and chunk directly from the in-memory buffer
    let chunks = [];
    if (isPdf) {
      chunks = await extractAndChunk(buffer, filename);
    } else {
      chunks = await extractAndChunkDocx(buffer, filename);
    }

    if (chunks.length === 0) {
      return NextResponse.json({ success: true, filename, chunkCount: 0 });
    }

    // Embed chunk text
    const chunkTexts = chunks.map((c) => c.text);
    const embeddings = await embedBatch(chunkTexts);

    // Form vectors for Pinecone
    const vectors = chunks.map((chunk, index) => ({
      id: chunk.id,
      values: embeddings[index],
      metadata: {
        text: chunk.text,
        filename: chunk.metadata.filename,
        pageNumber: chunk.metadata.pageNumber,
        chunkIndex: chunk.metadata.chunkIndex,
        type: 'chunk',
      },
    }));

    const indexInstance = getPineconeIndex();

    // Store a special "file manifest" record in Pinecone with the raw file
    // as a base64 string so it can be retrieved and served for download.
    // Pinecone requires at least one non-zero value, so we use a tiny unique
    // fingerprint vector. The values are so small that cosine similarity with
    // any real query embedding will be essentially zero — it will never surface
    // in semantic search results.
    const VECTOR_DIMENSION = 768;
    const manifestVector = new Array(VECTOR_DIMENSION).fill(0);
    // Set a few positions to tiny distinct non-zero values as a fingerprint
    manifestVector[0] = 1e-9;
    manifestVector[1] = 2e-9;
    manifestVector[2] = 3e-9;

    const base64Content = buffer.toString('base64');
    const mimeType = isPdf ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    await indexInstance.upsert({
      records: [{
        id: `__manifest__${filename}`,
        values: manifestVector,
        metadata: {
          type: 'manifest',
          filename,
          mimeType,
          base64Content,
        },
      }]
    });

    // Upsert chunk vectors in batches of 100
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await indexInstance.upsert({ records: batch });
    }

    return NextResponse.json({ success: true, filename, chunkCount: chunks.length });
  } catch (error: any) {
    console.error('Ingestion pipeline error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    const indexInstance = getPineconeIndex();

    // Delete all chunk vectors for this file
    await indexInstance.deleteMany({
      filter: {
        filename: { $eq: filename }
      }
    });

    // Also delete the manifest record
    await indexInstance.deleteMany({ ids: [`__manifest__${filename}`] });

    return NextResponse.json({ success: true, filename });
  } catch (error: any) {
    console.error('Deletion pipeline error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
