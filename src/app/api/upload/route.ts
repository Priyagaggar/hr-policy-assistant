import { NextRequest, NextResponse } from 'next/server';
import { extractAndChunk } from '@/lib/pdf-parser';
import { extractAndChunkDocx } from '@/lib/docx-parser';
import { embedBatch } from '@/lib/embeddings';
import { getPineconeIndex } from '@/lib/pinecone';
import fs from 'fs';
import path from 'path';

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

    // Physically save the file in the public/uploads directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    fs.writeFileSync(path.join(uploadsDir, filename), buffer);

    // Parse and chunk
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
      },
    }));

    // Upsert into Pinecone in batches of 100
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

    await indexInstance.deleteMany({
      filter: {
        filename: { $eq: filename }
      }
    });

    // Delete the file physically from the public/uploads directory
    const filePath = path.join(process.cwd(), 'public', 'uploads', filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return NextResponse.json({ success: true, filename });
  } catch (error: any) {
    console.error('Deletion pipeline error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
