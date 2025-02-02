import * as pdfjsLib from 'pdfjs-dist';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import * as tf from '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';

// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ProcessedDocument {
  id: string;
  chunks: string[];
  embeddings: number[][];
  metadata: {
    name: string;
    type: string;
    pageNumbers: number[];
    chunkSizes: number[];
    processingErrors?: string[];
    semanticSimilarity?: number[];
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
    const model = await loadModel();
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
        .replace(/\s+/g, ' ')  // Normalize whitespace
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

    // Generate embeddings for each chunk using Universal Sentence Encoder
    const embeddings = await Promise.all(
      processedChunks.map(async (chunk) => {
        const embedding = await model.embed(chunk);
        const data = await embedding.data();
        return Array.from(data) as number[];
      })
    );

    // Calculate semantic similarity between chunks
    const similarities = embeddings.map((embedding, i) => {
      if (i === 0) return 1;
      return tf.tensor1d(embedding)
        .dot(tf.tensor1d(embeddings[i - 1]))
        .div(tf.norm(tf.tensor1d(embedding))
        .mul(tf.norm(tf.tensor1d(embeddings[i - 1]))))
        .dataSync()[0];
    });

    return {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,  // More unique ID
      chunks: processedChunks,
      embeddings: embeddings,
      metadata: {
        name: file.name,
        type: file.type,
        pageNumbers: Array.from({ length: pdf.numPages }, (_, i) => i + 1),
        chunkSizes: processedChunks.map(chunk => chunk.length),
        semanticSimilarity: similarities
      }
    };
  } catch (error) {
    console.error('Error processing PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to process PDF document: ${errorMessage}`);
  }
}