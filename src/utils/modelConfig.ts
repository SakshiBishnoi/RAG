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
let userOpenRouterModel: string | null = null; // Store user-specified model
const DEFAULT_OPENROUTER_MODEL = "meta-llama/llama-3-8b-instruct:free"; // Default fallback model

export function setCurrentModel(model: ModelType) {
  currentModel = model;
}

export function getCurrentModel(): ModelType {
  return currentModel;
}

export function initializeModels(config: {
  geminiApiKey?: string; // Changed to optional
  userProvidedOpenRouterApiKey?: string;
  envProvidedOpenRouterApiKey?: string;
  userProvidedOpenRouterModel?: string;
  siteUrl?: string;
  siteName?: string;
}) {
  // IMPORTANT SECURITY NOTE:
  // The API keys used here (userProvidedOpenRouterApiKey, envProvidedOpenRouterApiKey)
  // are exposed in the client-side JavaScript bundle if this application is built as a standard SPA.
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

  if (config.geminiApiKey && config.geminiApiKey.trim() !== '') {
    geminiClient = new GoogleGenerativeAI(config.geminiApiKey);
  } else {
    geminiClient = null; // Ensure client is null if no key is available
  }

  const apiKeyToUse = config.userProvidedOpenRouterApiKey || config.envProvidedOpenRouterApiKey;

  if (apiKeyToUse) {
    openRouterClient = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: apiKeyToUse,
      dangerouslyAllowBrowser: true,
      defaultHeaders: {
        "HTTP-Referer": config.siteUrl || "",
        "X-Title": config.siteName || "",
      },
    });
  } else {
    openRouterClient = null; // Ensure client is null if no key is available
  }

  if (config.userProvidedOpenRouterModel && config.userProvidedOpenRouterModel.trim() !== '') {
    userOpenRouterModel = config.userProvidedOpenRouterModel;
  } else {
    userOpenRouterModel = null; // Or set to a default if preferred when user clears it
  }
}

export function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    throw new Error('Gemini client not initialized. Please ensure the Gemini API key is configured (e.g., via REACT_APP_GEMINI_API_KEY environment variable).');
  }
  return geminiClient;
}

export function isGeminiConfigured(): boolean {
  return geminiClient !== null;
}

export function getOpenRouterClient(): OpenAI {
  if (!openRouterClient) {
    // It's important to guide the user to settings if they try to use an OpenRouter model without configuration
    throw new Error('OpenRouter client not initialized or API key not provided. Please configure OpenRouter settings.');
  }
  return openRouterClient;
}

export async function generateWithOpenRouter(messages: any[]): Promise<string> {
  const client = getOpenRouterClient(); // This will throw if not initialized
  const modelToUse = userOpenRouterModel || DEFAULT_OPENROUTER_MODEL;

  const completion = await client.chat.completions.create({
    model: modelToUse,
    messages: messages.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content
    })),
  });
  return completion.choices[0]?.message?.content || '';
}