import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  getCurrentModel, // Keep one
  getGeminiClient,
  getOpenRouterClient,
  generateWithOpenRouter, // Updated import
  initializeModels,
  isGeminiConfigured // Added import for isGeminiConfigured
} from './modelConfig';

// Initialize models when the app starts
// App.tsx now handles initial loading of keys from localStorage and calls initializeModels
// So, this specific initialization might be redundant or could be simplified
// For now, let's ensure it uses the new signature if it remains.
// However, the more robust approach is that App.tsx is the sole caller of initializeModels after fetching all key sources.
// Let's comment this out from api.ts to avoid conflict and ensure App.tsx is the source of truth for initialization.
/*
if (process.env.REACT_APP_GEMINI_API_KEY) { // Check only for Gemini key, OpenRouter keys are optional
  initializeModels({
    geminiApiKey: process.env.REACT_APP_GEMINI_API_KEY,
    envProvidedOpenRouterApiKey: process.env.REACT_APP_OPENROUTER_API_KEY, // Pass env key
    // userProvidedOpenRouterApiKey and userProvidedOpenRouterModel will be undefined here initially
    siteUrl: window.location.href,
    siteName: 'RAG Application'
  });
}
*/
// Removed extraneous closing brace that was here

import { RelevantChunk } from '../services/VectorStoreService'; // Updated import path

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
  
  try { // General try-catch for all generation paths
    const currentModel = getCurrentModel();

    if (currentModel === 'deepseek') {
      const messages = previousMessages.concat([{
        type: 'user',
        content: message
      }]);
      return await generateWithOpenRouter(messages); // Added await and ensure it's caught by try-catch
    }

    // Gemini Path
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
    console.error('Error generating response in api.ts:', error);
    // The error message from getOpenRouterClient() is already user-friendly if that's the source.
    // For other potential errors (network, Gemini client issues), this re-throw is appropriate.
    throw new Error(error instanceof Error ? error.message : 'Failed to generate response due to an unexpected error.');
  }
}

export async function generateHypotheticalDocument(
  query: string,
  modelType: 'gemini' | 'deepseek' // Matches ModelType in modelConfig
): Promise<string> {
  const prompt = `Based on the following user question, please generate a concise, ideal document passage that directly answers the question. The passage should be well-structured, factual, and as if it's from a relevant document that would perfectly answer the query. Do not include any conversational fluff or preamble like "Here is a passage...". Just provide the passage itself. Question: '${query}'`;

  try {
    if (modelType === 'gemini') {
      if (!isGeminiConfigured()) { // Check if Gemini is configured
        throw new Error("Gemini client not configured. Cannot generate hypothetical document.");
      }
      const gemini = getGeminiClient();
      // Using a model known for instruction following, though flash might also work.
      // Consider making this model configurable or using a specific one for HyDE.
      const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } else if (modelType === 'deepseek') {
      // generateWithOpenRouter already checks if client is initialized
      return await generateWithOpenRouter([{ type: 'user', content: prompt }]);
    } else {
      throw new Error(`Unsupported model type for HyDE: ${modelType}`);
    }
  } catch (error) {
    console.error('Error generating hypothetical document:', error);
    // Prepend HyDE specific context to the error message
    const errorMessage = error instanceof Error ? error.message : "Failed to generate hypothetical document due to an unexpected error.";
    throw new Error(`HyDE generation failed: ${errorMessage}`);
  }
}

export async function rerankChunksWithLLM(
  originalQuery: string,
  chunks: RelevantChunk[],
  modelType: 'gemini' | 'deepseek', // Matches ModelType in modelConfig
  targetCount: number
): Promise<RelevantChunk[]> {
  if (!chunks || chunks.length === 0) {
    return [];
  }

  const assessmentPromises = chunks.map(async (chunk, index) => {
    const prompt = `User Query: '${originalQuery}'\n\nDocument Chunk:\n'${chunk.text}'\n\nIs this document chunk highly relevant to the User Query? Respond with only 'YES' or 'NO'.`;
    let isRelevant = false;

    try {
      let responseText = '';
      if (modelType === 'gemini') {
        if (!isGeminiConfigured()) {
          console.warn("Gemini client not configured. Cannot use for re-ranking, marking chunk as not relevant.");
          // Fallback: treat as not relevant if the required model is not configured
          return { chunk, isRelevant: false, originalIndex: index };
        }
        const gemini = getGeminiClient();
        const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash-latest" }); // Using flash for speed
        const result = await model.generateContent(prompt);
        responseText = result.response.text().trim().toUpperCase();
      } else if (modelType === 'deepseek') {
        // generateWithOpenRouter will throw if client not configured, caught by outer try-catch
        responseText = (await generateWithOpenRouter([{ type: 'user', content: prompt }])).trim().toUpperCase();
      } else {
        console.warn(`Unsupported model type for re-ranking: ${modelType}, marking chunk as not relevant.`);
        return { chunk, isRelevant: false, originalIndex: index };
      }
      isRelevant = responseText === 'YES';
    } catch (error) {
      console.error(`Error re-ranking chunk ${index} (Doc: ${chunk.docName}, ChunkIdx: ${chunk.chunkIndex}):`, error);
      isRelevant = false; // Treat as not relevant on error
    }
    return { chunk, isRelevant, originalIndex: index };
  });

  const relevanceResults = await Promise.allSettled(assessmentPromises);

  const relevantRankedChunks: RelevantChunk[] = [];
  relevanceResults.forEach(result => {
    if (result.status === 'fulfilled' && result.value.isRelevant) {
      relevantRankedChunks.push(result.value.chunk);
    } else if (result.status === 'rejected') {
      console.error("A re-ranking promise was rejected:", result.reason);
    }
  });

  // The chunks are already sorted by original similarity score from retrieveRelevantChunks.
  // Filtering by 'YES' preserves this relative order.
  return relevantRankedChunks.slice(0, targetCount);
}

export async function compressChunkWithLLM(
  originalQuery: string,
  chunk: RelevantChunk,
  modelType: 'gemini' | 'deepseek' // Align with how currentLLMModel is typed
): Promise<string | null> {
  const prompt = `User Query: '${originalQuery}'\n\nDocument Chunk Text:\n'${chunk.text}'\n\nConsidering the User Query, extract only the sentences or key phrases from the Document Chunk Text that are essential and directly relevant to answering the User Query. If no part of the chunk text is relevant to the query, respond with the exact word "NONE". Otherwise, return only the extracted relevant text.`;
  let compressedText: string = '';

  try {
    if (modelType === 'gemini') {
      if (!isGeminiConfigured()) {
        console.warn("Gemini client not configured. Cannot use for contextual compression.");
        return null; // Graceful degradation
      }
      const gemini = getGeminiClient();
      const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
      const result = await model.generateContent(prompt);
      compressedText = result.response.text().trim();
    } else if (modelType === 'deepseek') {
      // Relies on generateWithOpenRouter to throw if OpenRouter client is not configured
      compressedText = await generateWithOpenRouter([{ type: 'user', content: prompt }]);
      compressedText = compressedText.trim(); // Ensure trimming
    } else {
      console.error(`Unsupported model type for contextual compression: ${modelType}`);
      return null;
    }

    if (compressedText.toUpperCase() === 'NONE' || compressedText === '') {
      return null; // No relevant information found or empty response
    }
    return compressedText; // Return the compressed/extracted text

  } catch (error) {
    console.error(`Error during contextual compression for chunk (ID: ${chunk.docId}, Index: ${chunk.chunkIndex}):`, error);
    return null; // Signify compression failed for this chunk
  }
}

export async function generateDocumentSummary(
  fullText: string,
  modelType: 'gemini' | 'deepseek'
): Promise<string> {
  if (!fullText || fullText.trim() === "") {
    return "Document has no content to summarize.";
  }
  // Truncate fullText if too long for a summary prompt, though LLMs should handle large contexts.
  // For client-side, be mindful of token limits for the prompt itself if not for context window.
  const maxPromptLength = 15000; // Arbitrary limit for the prompt text around the main content
  const contentForSummary = fullText.length > maxPromptLength
    ? `${fullText.substring(0, maxPromptLength)}... (content truncated for summary prompt)`
    : fullText;

  const prompt = `Please provide a concise summary (around 3-5 sentences) of the following document content:\n\n"${contentForSummary}"`;

  try {
    if (modelType === 'gemini') {
      if (!isGeminiConfigured()) {
        throw new Error("Gemini client not configured. Cannot generate summary.");
      }
      const gemini = getGeminiClient();
      const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash-latest" }); // Flash is good for summarization
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } else if (modelType === 'deepseek') {
      return (await generateWithOpenRouter([{ type: 'user', content: prompt }])).trim();
    } else {
      throw new Error(`Unsupported model type for summary generation: ${modelType}`);
    }
  } catch (error) {
    console.error('Error generating document summary:', error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate summary due to an unexpected error.";
    // Return a more specific error message or the error itself if preferred by the caller
    throw new Error(`Summary generation failed: ${errorMessage}`);
  }
}