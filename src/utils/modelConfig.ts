import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from 'openai';

type ModelType = 'gemini' | 'deepseek';

interface ModelConfig {
  type: ModelType;
  apiKey: string;
  siteUrl?: string;
  siteName?: string;
}

let currentModel: ModelType = 'gemini';
let openRouterClient: OpenAI | null = null;
let geminiClient: GoogleGenerativeAI | null = null;

export function setCurrentModel(model: ModelType) {
  currentModel = model;
}

export function getCurrentModel(): ModelType {
  return currentModel;
}

export function initializeModels(config: {
  geminiApiKey: string;
  openRouterApiKey: string;
  siteUrl?: string;
  siteName?: string;
}) {
  // IMPORTANT SECURITY NOTE:
  // The API keys used here (REACT_APP_GEMINI_API_KEY, REACT_APP_OPENROUTER_API_KEY, which are passed in via `config`)
  // are exposed in the client-side JavaScript bundle if this application is built as a standard SPA (e.g., with Create React App).
  // This is a significant security risk for production applications, as it allows anyone to potentially use your API keys.
  //
  // For production environments, these API calls should ideally be proxied through a backend server
  // where API keys can be kept secret. The backend server would make the actual calls to Gemini/OpenRouter.
  //
  // The `dangerouslyAllowBrowser: true` flag for the OpenAI client (used for OpenRouter)
  // explicitly acknowledges that the client is intended to be run in a browser environment,
  // but this does not mitigate the risk of exposing the API key if it's embedded in client-side code.
  // Always ensure your .env variables are correctly configured and not committed to your repository if they contain sensitive keys.
  // For local development, using .env files is standard, but for deployment, a backend proxy is the recommended secure approach.

  geminiClient = new GoogleGenerativeAI(config.geminiApiKey);
  
  openRouterClient = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: config.openRouterApiKey,
    dangerouslyAllowBrowser: true,
    defaultHeaders: {
      "HTTP-Referer": config.siteUrl || "",
      "X-Title": config.siteName || "",
    },
  });
}

export function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    throw new Error('Gemini client not initialized');
  }
  return geminiClient;
}

export function getOpenRouterClient(): OpenAI {
  if (!openRouterClient) {
    throw new Error('OpenRouter client not initialized');
  }
  return openRouterClient;
}

export async function generateWithDeepseek(messages: any[]): Promise<string> {
  const client = getOpenRouterClient();
  const completion = await client.chat.completions.create({
    model: "deepseek/deepseek-chat-v3-0324:free",
    messages: messages.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content
    })),
  });
  return completion.choices[0]?.message?.content || '';
}