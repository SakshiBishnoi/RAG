import * as pdfjsLib from 'pdfjs-dist';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ProcessedDocument {
  id: string;
  chunks: string[];
  metadata: {
    name: string;
    type: string;
    pageNumbers: number[];
  };
}

export async function processPDFDocument(file: File): Promise<ProcessedDocument> {
  try {
    // Read the PDF file
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument(arrayBuffer);
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    // Split text into chunks
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const chunks = await splitter.createDocuments([fullText]);

    return {
      id: `${Date.now()}`,
      chunks: chunks.map(chunk => chunk.pageContent),
      metadata: {
        name: file.name,
        type: file.type,
        pageNumbers: Array.from({ length: pdf.numPages }, (_, i) => i + 1),
      }
    };
  } catch (error) {
    console.error('Error processing PDF:', error);
    throw new Error('Failed to process PDF document');
  }
} 