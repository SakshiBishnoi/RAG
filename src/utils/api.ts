import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  getCurrentModel,
  getGeminiClient,
  getOpenRouterClient,
  generateWithDeepseek,
  initializeModels
} from './modelConfig';

// Initialize models when the app starts
if (process.env.REACT_APP_GEMINI_API_KEY && process.env.REACT_APP_OPENROUTER_API_KEY) {
  initializeModels({
    geminiApiKey: process.env.REACT_APP_GEMINI_API_KEY,
    openRouterApiKey: process.env.REACT_APP_OPENROUTER_API_KEY,
    siteUrl: window.location.href,
    siteName: 'RAG Application'
  });
}

import { RelevantChunk } from './documentProcessor'; // Import RelevantChunk

interface GenerateResponseParams {
  message: string;
  isDocumentMode: boolean;
  relevantChunks?: RelevantChunk[]; // Changed from documents to relevantChunks
  previousMessages?: any[];
  analyzeSummary?: boolean; // These might be re-evaluated later
  extractKeyPoints?: boolean; // These might be re-evaluated later
}

export async function generateResponse({
  message,
  isDocumentMode,
  relevantChunks = [], // Changed from documents to relevantChunks
  previousMessages = []
}: GenerateResponseParams): Promise<string> {
  const currentModel = getCurrentModel();
  
  if (currentModel === 'deepseek') {
    const messages = previousMessages.concat([{
      type: 'user',
      content: message
    }]);
    return generateWithDeepseek(messages);
  }

  try {
    const model = getGeminiClient().getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // Include conversation history for context
    const chatHistory = previousMessages
      .map(msg => `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    let prompt = "";
    if (isDocumentMode) {
      if (!relevantChunks || relevantChunks.length === 0) {
        return "No relevant document sections found to answer your query. Please try rephrasing or ensure relevant documents are processed.";
      }
      // Create context from relevant chunks
      const documentContext = relevantChunks
        .map(chunk => {
          return `Document: ${chunk.docName}\nChunk Index: ${chunk.chunkIndex}\nSimilarity: ${chunk.similarity.toFixed(4)}\n\nContent:\n${chunk.text.trim()}`;
        })
        .join('\n\n---\n\n');

      // Enhanced Prompt for Document Mode
      prompt = `You are an AI assistant. Your task is to answer questions based *only* on the following text excerpts.

**Instructions for Responding:**
*   Base your answers strictly on the information contained in the text excerpts provided below. Do not use any external knowledge or make assumptions.
*   When quoting directly or paraphrasing specific information, *always* follow with a citation like (Document: [docName], Chunk: [chunkIndex]). Replace [docName] and [chunkIndex] with the actual document name and chunk index from the source excerpt.
*   If the answer requires synthesizing information from multiple excerpts, do so concisely. Cite all relevant source excerpts clearly.
*   If the answer to the question cannot be found *within the provided text excerpts*, explicitly state: 'Based on the provided information, I cannot answer this question.'
*   Respond in a clear, concise, and factual manner.

**Relevant Information Extracted from Documents:**
${documentContext}

**Previous Conversation:**
${chatHistory}

**User Question:** ${message}

Please provide a detailed and accurate response following all instructions above.`;
    } else {
      prompt = `You are a helpful AI assistant. Please provide a general response based on your knowledge.

Previous Conversation:
${chatHistory}

User Question: ${message}

Please provide a response that:
1. Uses your general knowledge to answer the question
2. Stays focused on the user's query
3. Does not reference any uploaded documents
4. Provides accurate and helpful information`;
    }

    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating response:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to generate response');
  }
}