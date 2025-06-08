import * as pdfjsLib from 'pdfjs-dist';
import * as tf from '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';
import { VectorStoreService } from './VectorStoreService'; // Assuming VectorStoreService is in the same directory

// Helper function to calculate cosine similarity between two vectors
// (Using the JS math version for simplicity here, could be a shared util)
function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
        console.warn("Cosine similarity calculation error: Invalid vectors provided.", {vecALength: vecA?.length, vecBLength: vecB?.length});
        return 0;
    }
    const dotProduct = vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));

    if (magnitudeA === 0 || magnitudeB === 0) {
        return 0;
    }
    return dotProduct / (magnitudeA * magnitudeB);
}

// Helper function to split text into sentences
function splitIntoSentences(text: string): string[] {
    if (!text) return [];
    // Using the regex from the prompt
    const sentences = text
        .replace(/([.?!])\s*(?=[A-Z])/g, "$1|")
        .split("|")
        .map(s => s.trim())
        .filter(s => s.length > 0);
    // Handle single line text or text without strong sentence break signals
    return sentences.length > 0 ? sentences : (text.trim() ? [text.trim()] : []);
}

export class DocumentProcessingService {
  private vectorStore: VectorStoreService;
  private sentenceEncoder: use.UniversalSentenceEncoder;
  private static pdfWorkerSrcConfigured: boolean = false; // Static to ensure it's configured only once per app load

  constructor(vectorStore: VectorStoreService, sentenceEncoder: use.UniversalSentenceEncoder) {
    this.vectorStore = vectorStore;
    this.sentenceEncoder = sentenceEncoder;

    if (typeof window !== 'undefined' && !DocumentProcessingService.pdfWorkerSrcConfigured) {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        DocumentProcessingService.pdfWorkerSrcConfigured = true;
        console.log("PDF.js worker source configured.");
    }
  }

  public async processPDF(
    file: File,
    docId: string,
    docName: string
  ): Promise<{ fullText: string; numChunks: number; metadata: { name: string; type: string; pageNumbers: number[]; chunkSizes: number[]; totalSentences: number; }; processingErrors?: string[]; processingTimeMs: number }> {

    const startTime = Date.now();
    const processingErrors: string[] = [];
    let fullText = '';
    let pageCount = 0;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument(arrayBuffer);
      const pdf = await loadingTask.promise;
      pageCount = pdf.numPages;

      for (let i = 1; i <= pdf.numPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str) // item is an object from pdfjs, casting to any for str
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
          fullText += pageText + '\n\n'; // Add double newline for better paragraph separation
        } catch (pageError: any) {
          console.error(`Error processing page ${i} of PDF ${docName}:`, pageError);
          processingErrors.push(`Error processing page ${i}: ${pageError.message || 'Unknown page error'}`);
        }
      }
    } catch (pdfError: any) {
      console.error(`Error loading PDF ${docName}:`, pdfError);
      processingErrors.push(`Failed to load PDF: ${pdfError.message || 'Unknown PDF loading error'}`);
      return {
        fullText: '', // No text extracted if PDF loading fails
        numChunks: 0,
        metadata: { name: docName, type: file.type, pageNumbers: [], chunkSizes: [], totalSentences: 0 },
        processingErrors,
        processingTimeMs: Date.now() - startTime,
      };
    }

    fullText = fullText.trim();
    if (fullText.length === 0 && processingErrors.length === 0) { // Only add this if no prior errors
         processingErrors.push("No text content extracted from PDF.");
    }

    const sentences = splitIntoSentences(fullText);
    if (sentences.length === 0 && fullText.length > 0 && processingErrors.length === 0) { // Only add if text existed but couldn't be split
        processingErrors.push("Text was extracted but could not be split into sentences.");
    }

    const finalChunks: string[] = [];
    const finalChunkEmbeddings: number[][] = [];
    const chunkSizes: number[] = [];

    if (sentences.length > 0) {
        try {
            await tf.tidy(async () => {
                const sentenceEmbeddingsTensor = await this.sentenceEncoder.embed(sentences);
                const sentenceEmbeddings = await sentenceEmbeddingsTensor.array() as number[][];
                tf.dispose(sentenceEmbeddingsTensor);

                const SIMILARITY_THRESHOLD = 0.4;
                let currentChunkSentences: string[] = [];

                for (let i = 0; i < sentences.length; i++) {
                    currentChunkSentences.push(sentences[i]);
                    // Check similarity with the NEXT sentence to decide if current sentence is the end of a chunk
                    if (i < sentences.length - 1) {
                        const similarity = calculateCosineSimilarity(sentenceEmbeddings[i], sentenceEmbeddings[i + 1]);
                        if (similarity < SIMILARITY_THRESHOLD) {
                            finalChunks.push(currentChunkSentences.join(' ').trim());
                            currentChunkSentences = []; // Reset for the next chunk
                        }
                    }
                }
                // Add the last chunk
                if (currentChunkSentences.length > 0) {
                    finalChunks.push(currentChunkSentences.join(' ').trim());
                }

                if (finalChunks.length > 0) {
                    const finalChunkEmbeddingsTensor = await this.sentenceEncoder.embed(finalChunks);
                    const embeddingsArray = await finalChunkEmbeddingsTensor.array() as number[][];
                    finalChunkEmbeddings.push(...embeddingsArray);
                    tf.dispose(finalChunkEmbeddingsTensor);
                    finalChunks.forEach(chunk => chunkSizes.push(chunk.length));
                }
            }); // end tf.tidy
        } catch (embeddingError: any) {
            console.error(`Error during semantic chunking or embedding for ${docName}:`, embeddingError);
            processingErrors.push(`Semantic chunking/embedding failed: ${embeddingError.message || 'Unknown embedding error'}`);
        }
    }

    if (finalChunks.length > 0 && finalChunks.length === finalChunkEmbeddings.length) {
        this.vectorStore.addDocument(docId, docName, finalChunks, finalChunkEmbeddings);
    } else if (finalChunks.length > 0 && finalChunks.length !== finalChunkEmbeddings.length) {
        processingErrors.push("Critical error: Chunk and embedding counts mismatched post-processing. Document not stored in vector store.");
        console.error("Chunk and embedding counts mismatched for docId:", docId, "Chunks:", finalChunks.length, "Embeddings:", finalChunkEmbeddings.length);
    } else if (finalChunks.length === 0 && processingErrors.length === 0 && sentences.length > 0) {
        // If there were sentences but no chunks were formed (e.g. all similarities above threshold making one giant chunk that might be too large or an issue in logic)
        processingErrors.push("No semantic chunks were formed from the sentences. Document content might be too homogenous or short.");
    }


    const endTime = Date.now();
    return {
        fullText, // Include fullText in the return
        numChunks: finalChunks.length,
        metadata: {
            name: docName,
            type: file.type,
            pageNumbers: Array.from({ length: pageCount }, (_, i) => i + 1),
            chunkSizes,
            totalSentences: sentences.length,
        },
        processingErrors: processingErrors.length > 0 ? processingErrors : undefined,
        processingTimeMs: endTime - startTime,
    };
  }
}
