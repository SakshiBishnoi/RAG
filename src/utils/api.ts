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

interface GenerateResponseParams {
  message: string;
  isDocumentMode: boolean;
  documents?: any[];
  previousMessages?: any[];
  analyzeSummary?: boolean;
  extractKeyPoints?: boolean;
}

export async function generateResponse({
  message,
  isDocumentMode,
  documents = [],
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
      // Create context from documents with better formatting
      const documentContext = documents
        .map(doc => {
          const chunks = doc.content.split('\n\n');
          return `Document: ${doc.name}\n\nRelevant Sections:\n${chunks
            .map((chunk: string, i: number) => `[Section ${i + 1}] ${chunk.trim()}`)
            .join('\n\n')}`;
        })
        .join('\n\n---\n\n');

      prompt = `You are a helpful AI assistant specialized in analyzing and answering questions about the provided documents. Your responses must be:

1. Strictly based on the document content below
2. Clearly reference which document and section you're using (e.g., "According to Document X, Section Y...")
3. If the answer isn't in the documents, say "This information is not found in the provided documents"

Document Context:
${documentContext}

Previous Conversation:
${chatHistory}

User Question: ${message}

Please provide a response that:
1. Directly quotes relevant sections when possible
2. Clearly cites which document and section each piece of information comes from
3. Does not make up information not present in the documents`;
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