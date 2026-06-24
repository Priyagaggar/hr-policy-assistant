import { NextRequest, NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
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

    // 1. Upload file to Vercel Blob for persistent storage & download access
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: isPdf
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const blobUrl = blob.url;

    // 2. Parse and chunk directly from the in-memory buffer
    let chunks = [];
    if (isPdf) {
      chunks = await extractAndChunk(buffer, filename);
    } else {
      chunks = await extractAndChunkDocx(buffer, filename);
    }

    if (chunks.length === 0) {
      return NextResponse.json({ success: true, filename, chunkCount: 0 });
    }

    // 3. Embed chunk text
    const chunkTexts = chunks.map((c) => c.text);
    const embeddings = await embedBatch(chunkTexts);

    // 4. Build Pinecone vectors — store the Blob URL only on the first chunk
    //    so it can be retrieved for download without exceeding metadata size limits
    const vectors = chunks.map((chunk, index) => ({
      id: chunk.id,
      values: embeddings[index],
      metadata: {
        text: chunk.text,
        filename: chunk.metadata.filename,
        pageNumber: chunk.metadata.pageNumber,
        chunkIndex: chunk.metadata.chunkIndex,
        type: 'chunk',
        ...(chunk.metadata.chunkIndex === 0 ? { blobUrl } : {}),
      },
    }));

    // 5. Upsert into Pinecone in batches of 100
    const indexInstance = getPineconeIndex();
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

    // Retrieve the blobUrl from the first chunk before deleting
    try {
      const queryEmbedding = new Array(768).fill(0.001);
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
      if (blobUrl) {
        await del(blobUrl);
      }
    } catch (blobErr) {
      console.warn('Could not delete blob (may not exist):', blobErr);
    }

    // Delete all Pinecone vectors for this file
    await indexInstance.deleteMany({
      filter: { filename: { $eq: filename } },
    });

    return NextResponse.json({ success: true, filename });
  } catch (error: any) {
    console.error('Deletion pipeline error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
