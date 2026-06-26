import Groq from 'groq-sdk';

const apiKey = process.env.GROQ_API_KEY || '';

export const groq = new Groq({ apiKey });
export const CHAT_MODEL = 'llama-3.3-70b-versatile';
