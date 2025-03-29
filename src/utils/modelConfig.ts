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