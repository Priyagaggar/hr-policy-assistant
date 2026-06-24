# Adani HR Policy Assistant 💬

An AI-powered HR Chatbot designed to help employees instantly query and understand company policy documents (PDF, DOCX). It utilizes RAG (Retrieval-Augmented Generation) to deliver accurate, context-aware answers coupled with precise page-level and paragraph-level citations.

---

## 🏗️ Architecture

```text
[PDF / DOCX Upload] ──> Extract Text (pdf-parse / mammoth) ──> Chunking ──> Gemini Embeddings ──> Pinecone (Vector Db)
                                                                                                        │
                                                                                                        ▼
[Employee Question] ──> Generate Query Embedding ──> Semantic Search ──> Retrieve Top 5 Chunks ───> Gemini LLM ──> Answer + Citations
```

---

## 🛠️ Technology Stack

| Component | Technology | Description |
|---|---|---|
| **Core Framework** | Next.js 16 (App Router) | React framework for frontend and serverless API routes |
| **Styling** | Tailwind CSS v4 | Custom variables + dark-mode support |
| **Vector Database** | Pinecone | Cloud-hosted vector database for fast semantic matching |
| **AI Models** | Google Gemini (1.5 Flash) | For generating embeddings and synthesis of conversational answers |
| **Document Parsers** | `pdf-parse` & `mammoth` | For extracting text from PDF and Word (.docx) files |

---

## 🧠 Key RAG Concepts

- **RAG (Retrieval-Augmented Generation)**: Standard LLMs only know public data up to their training cutoff. RAG retrieves relevant document contexts from your custom uploaded documents first, then sends that context with the question to the LLM to get an accurate answer.
- **Embeddings**: Text converted into a list of numbers (vectors) representing its semantic meaning. Semantic search calculates distance between these vectors, matching questions by intent instead of raw keywords.
- **Pinecone (Vector Database)**: Unlike local vector storage (like FAISS), Pinecone keeps the document indices persistent in the cloud, allowing serverless Vercel functions to remain stateless and scale seamlessly.

---

## 🚀 Local Setup

### 1. Prerequisites
Ensure you have **Node.js (v18+)** installed.

### 2. Environment Configuration
Create a `.env.local` file in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=hr-policies
```

### 3. Install & Start Dev Server
```bash
npm install
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** for the Employee Chat Portal, and **[http://localhost:3000/admin](http://localhost:3000/admin)** for the Admin Panel.

---

## 📄 API Reference Summary

### `POST /api/upload`
- **Request**: `multipart/form-data` containing `file`
- **Response**: `{ success: true, filename: string, chunkCount: number }`

### `DELETE /api/upload?filename=...`
- **Request**: Query parameter `filename`
- **Response**: `{ success: true, message: string }`

### `POST /api/chat`
- **Request**: `{ question: string, history: ChatMessage[] }`
- **Response**: `{ answer: string, sources: Source[] }`

---

## 💡 Troubleshooting & Common Issues

- **Pinecone dimension mismatch**: Ensure your Pinecone index is configured with **768 dimensions** (to match Google's `text-embedding-004`).
- **Rate Limit (429 errors)**: Sequential uploads are built-in on the Admin UI to prevent hitting parallel upload API limits.
- **Timeout on large files**: Vercel free functions have a 10s execution limit. Keep document sizes under 5-10MB.
