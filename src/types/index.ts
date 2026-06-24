export interface Chunk {
  id: string;
  text: string;
  metadata: {
    filename: string;
    pageNumber: number;
    chunkIndex: number;
  };
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

export interface Source {
  index: number;
  filename: string;
  pageNumber: number;
  excerpt: string;
}

export interface UploadedDocument {
  filename: string;
  chunkCount: number;
  uploadedAt: string;
}
