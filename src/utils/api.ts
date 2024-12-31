import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY || '');

interface GenerateResponseParams {
  message: string;
  isDocumentMode: boolean;
  documents?: any[];
  previousMessages?: any[];
}

export async function generateResponse({
  message,
  isDocumentMode,
  documents = [],
  previousMessages = []
}: GenerateResponseParams): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

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
      prompt = `You are a helpful AI assistant. Consider the following conversation and documents as context, but feel free to provide broader information.

${documents.length > 0 ? 'Available Documents Context (for reference):\n' + 
  documents.map(doc => `Document: ${doc.name}\nContent: ${doc.content}`).join('\n\n') : ''}

Previous Conversation:
${chatHistory}

User Question: ${message}

Please provide a helpful response. You can reference the documents if relevant, but feel free to provide broader information and insights.`;
    }

    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating response:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to generate response');
  }
} 