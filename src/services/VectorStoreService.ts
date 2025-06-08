import * as tf from '@tensorflow/tfjs';

// Define RelevantChunk interface
// In a larger application, this might be moved to a common types file (e.g., src/types/documents.ts)
export interface RelevantChunk {
  docId: string;
  docName: string;
  chunkIndex: number;
  text: string;
  similarity: number;
}

export class VectorStoreService {
  private chunksMap: Map<string, string[]> = new Map();
  private embeddingsMap: Map<string, number[][]> = new Map();
  private docMetadataMap: Map<string, { name: string }> = new Map();

  constructor() {
    // Initialization if any (currently none needed for maps)
    console.log("VectorStoreService initialized.");
  }

  public addDocument(docId: string, docName: string, chunks: string[], embeddings: number[][]): void {
    if (chunks.length !== embeddings.length) {
      console.error(`Mismatch between chunk count (${chunks.length}) and embedding count (${embeddings.length}) for docId: ${docId}. Document not added.`);
      // Or throw new Error(...);
      return;
    }
    this.chunksMap.set(docId, chunks);
    this.embeddingsMap.set(docId, embeddings);
    this.docMetadataMap.set(docId, { name: docName });
    console.log(`Document ${docId} ('${docName}') added to VectorStore with ${chunks.length} chunks.`);
  }

  public removeDocument(docId: string): void {
    const existed = this.chunksMap.delete(docId);
    this.embeddingsMap.delete(docId);
    this.docMetadataMap.delete(docId);
    if (existed) {
      console.log(`Document ${docId} removed from VectorStore.`);
    }
  }

  public getChunks(docId: string): string[] | undefined {
    return this.chunksMap.get(docId);
  }

  public getEmbeddings(docId: string): number[][] | undefined {
    return this.embeddingsMap.get(docId);
  }

  public getDocName(docId: string): string | undefined {
    return this.docMetadataMap.get(docId)?.name;
  }

  public getAllDocIds(): string[] {
    return Array.from(this.chunksMap.keys());
  }

  // Cosine similarity helper
  private static calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
        // Added check for empty vector to prevent NaN from 0/0
        console.warn("Cosine similarity calculation error: Invalid vectors provided.", {vecALength: vecA?.length, vecBLength: vecB?.length});
        return 0;
    }
    const dotProduct = vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));

    if (magnitudeA === 0 || magnitudeB === 0) {
        // This case implies one or both vectors are zero vectors.
        // If both are zero vectors, similarity could be 1 or undefined based on definition.
        // If one is zero and other is not, similarity is 0.
        // Returning 0 is a safe choice here.
        return 0;
    }
    return dotProduct / (magnitudeA * magnitudeB);
  }

  public retrieveRelevantChunks(
    queryEmbedding: number[],
    activeDocIds: string[],
    topK: number = 5
  ): RelevantChunk[] {
    const allPossibleChunks: RelevantChunk[] = [];

    if (!queryEmbedding || queryEmbedding.length === 0) {
        console.warn("Query embedding is empty. Cannot retrieve chunks.");
        return [];
    }

    // tf.tidy is used to manage memory for TensorFlow.js tensors.
    // In this specific implementation of calculateCosineSimilarity (pure JS math),
    // no intermediate TFJS tensors are created for the similarity calculation itself.
    // However, if future modifications to calculateCosineSimilarity or other parts
    // within this loop were to use TFJS tensors, tf.tidy would be beneficial.
    // For now, its direct impact here is minimal but doesn't harm.
    tf.tidy(() => {
        for (const docId of activeDocIds) {
            const docChunks = this.getChunks(docId);
            const docEmbeddings = this.getEmbeddings(docId);
            const docName = this.getDocName(docId) || 'Unknown Document';

            if (docChunks && docEmbeddings) {
                if (docChunks.length !== docEmbeddings.length) {
                    console.warn(`Skipping docId ${docId} in retrieveRelevantChunks due to mismatch in chunk/embedding counts.`);
                    continue;
                }

                for (let i = 0; i < docChunks.length; i++) {
                    const chunkText = docChunks[i];
                    const chunkEmbedding = docEmbeddings[i];

                    if (!chunkEmbedding || chunkEmbedding.length === 0) {
                        console.warn(`Skipping chunk ${i} in docId ${docId} due to empty embedding.`);
                        continue;
                    }

                    // Using the static JS math version
                    const similarity = VectorStoreService.calculateCosineSimilarity(queryEmbedding, chunkEmbedding);

                    allPossibleChunks.push({
                        docId,
                        docName,
                        chunkIndex: i,
                        text: chunkText,
                        similarity,
                    });
                }
            }
        }
    }); // End of tf.tidy

    allPossibleChunks.sort((a: RelevantChunk, b: RelevantChunk) => b.similarity - a.similarity);
    return allPossibleChunks.slice(0, topK);
  }
}
