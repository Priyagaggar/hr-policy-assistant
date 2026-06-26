import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('GEMINI_API_KEY is not defined in environment variables.');
}

export const ai = new GoogleGenAI({ apiKey });

export const CHAT_MODEL = 'gemini-2.0-flash';
export const EMBEDDING_MODEL = 'gemini-embedding-001';