import * as pdfjsLib from 'pdfjs-dist';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import * as tf from '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';
import { getCurrentModel, getGeminiClient, getOpenRouterClient, generateWithDeepseek } from './modelConfig';

// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Helper function to split text into sentences
// This is a simplified sentence splitter and might not cover all edge cases perfectly.
// For more robust sentence splitting, a dedicated NLP library would be better.
function splitIntoSentences(text: string): string[] {
  if (!text) return [];
  // Regex to split by common sentence terminators (. ! ?) followed by whitespace or end of string.
  // It tries to handle some abbreviations (e.g. Mr., Mrs., Dr., U.S.) by not splitting after them if they are not followed by uppercase letter.
  // This is still a heuristic and might not be perfect.
  const sentences = text
    .replace(/([.!?])\s+(?=[A-Z])/g, "$1\r\n") // Add newline after sentence end if followed by uppercase
    .split(/\r\n/g) // Split by the added newlines
    .map(s => s.trim())
    .filter(s => s.length > 0);

  // Fallback for texts that might not have strong signals like uppercase starts
  if (sentences.length <= 1 && text.length > 0) {
    const simpleSplit = text.match(/[^.!?]+[.!?]+(\s|$)/g);
    if (simpleSplit && simpleSplit.length > 0) {
      return simpleSplit.map(s => s.trim()).filter(s => s.length > 0);
    }
  }
  return sentences.length > 0 ? sentences : (text.trim() ? [text.trim()] : []);
}


// Helper function to calculate cosine similarity between two vectors
function calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    magnitudeA += vectorA[i] * vectorA[i];
    magnitudeB += vectorB[i] * vectorB[i];
  }
  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0; // Avoid division by zero
  }
  return dotProduct / (magnitudeA * magnitudeB);
}


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
    const modelEncoder = await loadModel(); // Renamed to avoid conflict with 'encoder' variable if any
    if (!modelEncoder) {
      throw new Error("Failed to load sentence encoder model.");
    }
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


    // Semantic Chunking Implementation
    const sentences = splitIntoSentences(fullText);

    if (sentences.length === 0) {
      // Handle documents with no extractable sentences
      return {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-empty`,
        numChunks: 0,
        summary: 'Document appears to be empty or text could not be extracted.',
        fullText: fullText,
        metadata: {
          name: file.name, type: file.type, pageNumbers: [], chunkSizes: [],
          processingErrors: ['No sentences found in document.'],
        }
      };
    }

    // Generate sentence embeddings
    const sentenceEmbeddingsTensors = await Promise.all(sentences.map(s => modelEncoder.embed(s)));
    const sentenceEmbeddings = await Promise.all(sentenceEmbeddingsTensors.map(tensor => Array.from(tensor.dataSync())));
    sentenceEmbeddingsTensors.forEach(tensor => tensor.dispose()); // Dispose sentence tensors

    // Calculate inter-sentence similarities
    const interSentenceSimilarities: number[] = [];
    for (let i = 0; i < sentenceEmbeddings.length - 1; i++) {
      const similarity = calculateCosineSimilarity(sentenceEmbeddings[i], sentenceEmbeddings[i + 1]);
      interSentenceSimilarities.push(similarity);
    }

    // Identify chunk boundaries using a threshold
    const SIMILARITY_THRESHOLD = 0.4; // This threshold might need tuning

    // Refined chunking logic:
    const finalSemanticChunks: string[] = [];
    if (sentences.length > 0) {
      let chunkBuffer: string[] = [sentences[0]];
      for (let i = 0; i < interSentenceSimilarities.length; i++) {
        if (interSentenceSimilarities[i] < SIMILARITY_THRESHOLD) {
          finalSemanticChunks.push(chunkBuffer.join(' ').trim());
          chunkBuffer = [sentences[i+1]]; // Start new chunk
        } else {
          chunkBuffer.push(sentences[i+1]); // Continue current chunk
        }
      }
      if (chunkBuffer.length > 0) { // Add the last chunk
        finalSemanticChunks.push(chunkBuffer.join(' ').trim());
      }
    } else if (sentences.length === 1){ // Handle single sentence case
        finalSemanticChunks.push(sentences[0]);
    }


    // Generate embeddings for the final semantic chunks
    let finalChunkEmbeddings: number[][] = [];
    if (finalSemanticChunks.length > 0) {
        const chunkEmbeddingsTensors = await Promise.all(finalSemanticChunks.map(chunk => modelEncoder.embed(chunk)));
        finalChunkEmbeddings = await Promise.all(chunkEmbeddingsTensors.map(tensor => Array.from(tensor.dataSync())));
        chunkEmbeddingsTensors.forEach(tensor => tensor.dispose()); // Dispose chunk tensors
    }

    const processedChunks = finalSemanticChunks; // Use semantic chunks
    const embeddings = finalChunkEmbeddings; // Use their embeddings
    const chunkSizes = processedChunks.map(chunk => chunk.length);

    // Store chunks and embeddings in memory
    const docId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    addDocumentChunks(docId, processedChunks);
    addDocumentEmbeddings(docId, embeddings);

    // The old 'similarities' (inter-chunk) is not directly comparable.
    // For now, we'll omit it or calculate it based on new chunks if needed.
    // Let's remove it for now from the ProcessedDocument metadata for semantic chunks.
    // const semanticSimilarity = undefined; // Or calculate if a new definition is provided

    // Generate a summary using the selected model
    const currentModelName = getCurrentModel(); // Renamed to avoid conflict
    let summaryText = '';
    
    // Summary generation should be robust to client initialization issues
    try {
      if (currentModelName === 'deepseek') {
        // Check if OpenRouter is configured before attempting to use it
        const openRouterClient = getOpenRouterClient(); // This will throw if not configured
        summaryText = await generateWithOpenRouter([{ // Ensure generateWithOpenRouter is used
          type: 'user',
          content: `Please provide a concise summary of the following document content:\n\n${fullText}`
        }]);
      } else if (isGeminiConfigured()){ // Check if Gemini is configured
        const geminiClient = getGeminiClient(); // This will throw if not configured
        const geminiModel = geminiClient.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
        const summaryResult = await geminiModel.generateContent(
          `Please provide a concise summary of the following document content:\n\n${fullText}`
        );
        summaryText = summaryResult.response.text();
      } else {
        summaryText = "Summary generation skipped: No suitable model configured.";
      }
    } catch (summaryError) {
        console.warn("Could not generate summary:", summaryError);
        summaryText = `Summary generation failed: ${summaryError instanceof Error ? summaryError.message : String(summaryError)}`;
    }


    return {
      id: docId,
      numChunks: processedChunks.length,
      summary: summaryText,
      fullText: fullText,
      metadata: {
        name: file.name,
        type: file.type,
        pageNumbers: Array.from({ length: pdf.numPages }, (_, i) => i + 1), // Page numbers still relevant
        chunkSizes: chunkSizes, // Use new chunk sizes
        // semanticSimilarity: undefined, // Removed as per previous note
      }
    };
  } catch (error) {
    console.error('Error processing PDF with semantic chunking:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during PDF processing.';
    // Construct a ProcessedDocument compatible error response
    const errorDocId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-error`;
    return {
      id: errorDocId,
      numChunks: 0,
      fullText: (error as any)?.fullText || '', // Try to retain fullText if available from partial processing
      summary: '',
      metadata: {
        name: file?.name || "Unknown file", // file might be undefined if error is very early
        type: file?.type || "Unknown type",
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

// Function to retrieve relevant chunks based on a query or a pre-computed embedding
export async function retrieveRelevantChunks(
  queryOrEmbedding: string | number[], // Accepts string (original query) or number[] (HyDE embedding)
  activeDocIds: string[],
  allDocsMetadata: Array<{ id: string; name: string; processed?: boolean }>,
  topK: number = 5,
): Promise<RelevantChunk[]> {
  const sentenceEncoderModel = await loadModel(); // Renamed for clarity
  if (!sentenceEncoderModel) {
    console.error("Failed to load the Universal Sentence Encoder model.");
    return [];
  }

  let queryEmbedding: number[];
  let queryEmbeddingTensorInternal: tf.Tensor | null = null; // For disposal if created internally

  try {
    if (typeof queryOrEmbedding === 'string') {
      queryEmbeddingTensorInternal = await sentenceEncoderModel.embed(queryOrEmbedding);
      queryEmbedding = Array.from(await queryEmbeddingTensorInternal.dataSync());
    } else {
      queryEmbedding = queryOrEmbedding;
    }

    if (!queryEmbedding || queryEmbedding.length === 0) {
      console.error("Query embedding is empty.");
      return [];
    }

    const allRelevantChunks: RelevantChunk[] = [];

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
    queryEmbeddingTensorInternal?.dispose(); // Dispose only if created internally
  }

  // Sort by similarity in descending order and return topK
  allRelevantChunks.sort((a, b) => b.similarity - a.similarity);
  return allRelevantChunks.slice(0, topK);
}