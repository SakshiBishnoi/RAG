// This file now primarily contains the Universal Sentence Encoder model loader.
// Other document processing logic has been moved to DocumentProcessingService.ts
// This file now primarily contains the Universal Sentence Encoder model loader.
// Other document processing logic has been moved to DocumentProcessingService.ts
// and data storage/retrieval to VectorStoreService.ts.
// The RelevantChunk interface is now defined and exported from VectorStoreService.ts

import * as use from '@tensorflow-models/universal-sentence-encoder';

let encoder: use.UniversalSentenceEncoder | null = null;

/**
 * Loads and returns the Universal Sentence Encoder model.
 * Ensures that the model is loaded only once.
 */
export async function loadModel(): Promise<use.UniversalSentenceEncoder> {
  if (!encoder) {
    try {
      encoder = await use.load();
      console.log("Universal Sentence Encoder model loaded successfully.");
    } catch (error) {
      console.error("Error loading Universal Sentence Encoder model:", error);
      throw new Error("Failed to load the sentence encoder model. Please check your internet connection or model hosting.");
    }
  }
  if (!encoder) { // Double check in case of a load failure that didn't throw as expected
    throw new Error("Sentence encoder model is not available after attempting to load.");
  }
  return encoder;
}

// Any other truly shared, low-level utility functions related to document processing
// that don't fit into a specific service could reside here in the future.
// For now, it's focused on the sentence encoder model loading.
