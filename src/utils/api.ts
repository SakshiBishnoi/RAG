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
      // Create context from documents
      const documentContext = documents
        .map(doc => `Document: ${doc.name}\nContent: ${doc.content}`)
        .join('\n\n');

      prompt = `You are a helpful AI assistant. Use the following documents as your primary knowledge source, but you can also provide additional relevant information when necessary.

Document Context:
${documentContext}

Previous Conversation:
${chatHistory}

User Question: ${message}

Please provide a response that:
1. Primarily uses information from the provided documents
2. Clearly indicates when you're referencing document content
3. Can supplement with general knowledge when relevant, but prioritize document information
4. If the documents don't contain relevant information, say so and provide a general response`;
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