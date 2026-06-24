import { Pinecone } from '@pinecone-database/pinecone';

const apiKey = process.env.PINECONE_API_KEY;
const indexName = process.env.PINECONE_INDEX_NAME || 'hr-policies';

if (!apiKey) {
  throw new Error('PINECONE_API_KEY is not defined in environment variables.');
}

const pinecone = new Pinecone({
  apiKey,
});

export function getPineconeIndex() {
  return pinecone.index(indexName);
}
