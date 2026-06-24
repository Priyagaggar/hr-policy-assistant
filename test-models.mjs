import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

// Manually parse .env.local
const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/GEMINI_API_KEY\s*=\s*(.*)/);
const apiKey = match ? match[1].trim().replace(/['"]/g, '') : null;

if (!apiKey) {
  console.error("No API key found in .env.local");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function checkModel(modelName) {
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("test");
    console.log(`✅ Success for: ${modelName}`);
    return true;
  } catch (err) {
    console.log(`❌ Failed for: ${modelName} - ${err.message}`);
    return false;
  }
}

async function main() {
  const models = [
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-2.5-flash',
    'gemini-flash-latest'
  ];
  for (const m of models) {
    await checkModel(m);
  }
}

main();
