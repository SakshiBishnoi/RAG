import * as pdfjsLib from 'pdfjs-dist';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import * as tf from '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';
import { getCurrentModel, getGeminiClient, getOpenRouterClient, generateWithDeepseek } from './modelConfig';

// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// In-memory stores for document chunks and embeddings
let documentChunks: { [docId: string]: string[] } = {};
let documentEmbeddings: { [docId: string]: number[][] } = {};

// Functions to manage in-memory stores
export function addDocumentChunks(docId: string, chunks: string[]) {
  documentChunks[docId] = chunks;
}

export function addDocumentEmbeddings(docId: string, embeddings: number[][]) {
  documentEmbeddings[docId] = embeddings;
}

export function getDocumentChunks(docId: string): string[] | undefined {
  return documentChunks[docId];
}

export function getDocumentEmbeddings(docId: string): number[][] | undefined {
  return documentEmbeddings[docId];
}

export function removeDocumentData(docId: string) {
  delete documentChunks[docId];
  delete documentEmbeddings[docId];
}

// Helper for Deletion
export function clearDocumentFromInMemoryStore(docId: string) {
  removeDocumentData(docId);
}

export interface ProcessedDocument {
  id: string;
  numChunks: number;
  summary?: string;
  fullText: string; // Added fullText
  metadata: {
    name: string;
    type: string;
    pageNumbers: number[];
    chunkSizes: number[]; // Will store original chunk sizes, not from processedChunks after trim
    processingErrors?: string[];
    semanticSimilarity?: number[]; // This might be less critical if we have chunk-level embeddings
  };
}

let encoder: use.UniversalSentenceEncoder | null = null;

async function loadModel() {
  if (!encoder) {
    encoder = await use.load();
  }
  return encoder;
}

export async function processPDFDocument(file: File): Promise<ProcessedDocument> {
  try {
    // Load the Universal Sentence Encoder model
    const encoder = await loadModel();
    // Read the PDF file
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument(arrayBuffer);
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    // Extract text from each page with improved formatting
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .replace(/s+/g, ' ')  // Normalize whitespace
        .trim();
      fullText += pageText + '\n\n';  // Add double newline for better paragraph separation
    }

    // Split text into chunks with improved parameters
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,  // Smaller chunks for better context
      chunkOverlap: 100,  // Maintain context between chunks
      lengthFunction: (text) => text.split(' ').length,  // Split by words instead of characters
      separators: ['\n\n', '\n', '. ', ' ', ''],  // More natural text boundaries
    });

    const chunks = await splitter.createDocuments([fullText]);
    const processedChunks = chunks.map(chunk => chunk.pageContent.trim());
    const originalChunkSizes = chunks.map(chunk => chunk.pageContent.length); // Store original chunk sizes

    // Generate embeddings for each chunk using Universal Sentence Encoder
    const embeddings = await Promise.all(
      processedChunks.map(async (chunk) => {
        const embedding = await encoder.embed(chunk);
        const data = await embedding.data();
        return Array.from(data) as number[];
      })
    );

    // Store chunks and embeddings in memory
    const docId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`; // More unique ID
    addDocumentChunks(docId, processedChunks);
    addDocumentEmbeddings(docId, embeddings);

    // Calculate semantic similarity between chunks
    const similarities = embeddings.map((embedding, i) => {
      if (i === 0) return 1; // Similarity with itself is 1 or handle as per need
      if (!embeddings[i-1]) return 0; // Should not happen if logic is correct
      const normPrev = tf.norm(tf.tensor1d(embeddings[i - 1]));
      if (normPrev.dataSync()[0] === 0) return 0; // Avoid division by zero if previous embedding is zero vector

      return tf.tensor1d(embedding)
        .dot(tf.tensor1d(embeddings[i - 1]))
        .div(tf.norm(tf.tensor1d(embedding)).mul(normPrev))
        .dataSync()[0];
    });

    // Generate a summary using the selected model
    const currentModel = getCurrentModel();
    let summaryText = '';
    
    if (currentModel === 'deepseek') {
      summaryText = await generateWithDeepseek([{
        type: 'user',
        content: `Please provide a concise summary of the following document content:\n\n${fullText}`
      }]);
    } else {
      const geminiModel = getGeminiClient().getGenerativeModel({ model: "gemini-2.0-flash-exp" });
      const summaryResult = await geminiModel.generateContent(
        `Please provide a concise summary of the following document content:\n\n${fullText}`
      );
      summaryText = summaryResult.response.text();
    }

    return {
      id: docId,
      numChunks: processedChunks.length,
      summary: summaryText,
      fullText: fullText,
      metadata: {
        name: file.name,
        type: file.type,
        pageNumbers: Array.from({ length: pdf.numPages }, (_, i) => i + 1),
        chunkSizes: originalChunkSizes, // Use original chunk sizes
        semanticSimilarity: similarities
      }
    };
  } catch (error) {
    console.error('Error processing PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Construct a ProcessedDocument compatible error response
    const docId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-error`;
    return {
      id: docId,
      numChunks: 0,
      fullText: '',
      summary: '',
      metadata: {
        name: file.name,
        type: file.type,
        pageNumbers: [],
        chunkSizes: [],
        processingErrors: [errorMessage],
      }
    };
  }
}

// Interface for relevant chunks to be returned by the retrieval function
export interface RelevantChunk {
  docId: string;
  docName: string;
  chunkIndex: number;
  text: string;
  similarity: number;
}

// Function to retrieve relevant chunks based on a query
export async function retrieveRelevantChunks(
  query: string,
  activeDocIds: string[],
  allDocsMetadata: Array<{ id: string; name: string; processed?: boolean }>,
  topK: number = 5,
): Promise<RelevantChunk[]> {
  const model = await loadModel();
  if (!model) {
    console.error("Failed to load the Universal Sentence Encoder model.");
    return [];
  }

  let queryEmbeddingTensor: tf.Tensor | null = null;
  const allRelevantChunks: RelevantChunk[] = [];

  try {
    queryEmbeddingTensor = await model.embed(query);
    const queryEmbedding = Array.from(await queryEmbeddingTensor.data()) as number[];

    for (const docId of activeDocIds) {
      const chunks = getDocumentChunks(docId);
      const embeddings = getDocumentEmbeddings(docId);
      const docMetadata = allDocsMetadata.find(doc => doc.id === docId);
      const docName = docMetadata?.name || 'Unknown Document';

      if (chunks && embeddings && chunks.length === embeddings.length) {
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const chunkEmbedding = embeddings[i];
          let chunkTensor: tf.Tensor1D | null = null;
          let queryTensorForCalc: tf.Tensor1D | null = null;

          try {
            chunkTensor = tf.tensor1d(chunkEmbedding);
            queryTensorForCalc = tf.tensor1d(queryEmbedding);

            const chunkNorm = tf.norm(chunkTensor);
            const queryNorm = tf.norm(queryTensorForCalc);

            if (chunkNorm.dataSync()[0] === 0 || queryNorm.dataSync()[0] === 0) {
              allRelevantChunks.push({
                docId,
                docName,
                chunkIndex: i,
                text: chunk,
                similarity: 0, // Or handle as a very low similarity
              });
              continue;
            }

            // Cosine similarity calculation: dot(A, B) / (norm(A) * norm(B))
            // Simplified by normalizing first: dot( A/norm(A) , B/norm(B) )
            const similarityTensor = tf.sum(
              tf.mul(
                tf.div(chunkTensor, chunkNorm),
                tf.div(queryTensorForCalc, queryNorm)
              )
            );
            const similarity = similarityTensor.dataSync()[0];
            similarityTensor.dispose();


            allRelevantChunks.push({
              docId,
              docName,
              chunkIndex: i,
              text: chunk,
              similarity,
            });
          } finally {
            chunkTensor?.dispose();
            queryTensorForCalc?.dispose();
          }
        }
      } else {
        if (!chunks || !embeddings) {
          console.warn(`Chunks or embeddings missing for docId: ${docId}`);
        } else if (chunks.length !== embeddings.length) {
          console.warn(`Chunk and embedding length mismatch for docId: ${docId}`);
        }
      }
    }
  } catch (error) {
    console.error("Error during chunk retrieval or embedding generation:", error);
  } finally {
    queryEmbeddingTensor?.dispose();
  }

  // Sort by similarity in descending order and return topK
  allRelevantChunks.sort((a, b) => b.similarity - a.similarity);
  return allRelevantChunks.slice(0, topK);
}