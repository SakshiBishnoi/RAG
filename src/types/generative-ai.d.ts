declare module '@google/generative-ai' {
  export class GoogleGenerativeAI {
    constructor(apiKey: string);
    getGenerativeModel(config: { model: string }): GenerativeModel;
  }

  export interface GenerativeModel {
    generateContent(prompt: string | string[] | GenerateContentPrompt): Promise<GenerateContentResult>;
  }

  interface GenerateContentPrompt {
    text?: string;
    parts?: Array<{ text: string }>;
  }

  export interface GenerateContentResult {
    response: {
      text(): string;
      promptFeedback?: {
        blockReason?: string;
        safetyRatings?: Array<{
          category: string;
          probability: string;
        }>;
      };
    };
  }
} 