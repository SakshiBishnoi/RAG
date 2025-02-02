import * as tf from '@tensorflow/tfjs';
import { ProcessedDocument } from './documentProcessor';

export interface ConceptNode {
  id: string;
  label: string;
  type: 'document' | 'topic' | 'concept';
  size?: number;
  group?: number;
}

export interface ConceptEdge {
  source: string;
  target: string;
  weight: number;
  type: 'similarity' | 'topic' | 'reference';
}

export interface ConceptGraph {
  nodes: ConceptNode[];
  edges: ConceptEdge[];
}

export interface ResearchNote {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  tags: string[];
  timestamp: string;
  links: string[];
}

export class ConceptMapper {
  private documents: ProcessedDocument[] = [];
  private notes: ResearchNote[] = [];
  
  addDocument(document: ProcessedDocument) {
    this.documents.push(document);
  }

  addNote(note: ResearchNote) {
    this.notes.push(note);
  }

  generateConceptGraph(): ConceptGraph {
    const nodes: ConceptNode[] = [];
    const edges: ConceptEdge[] = [];

    // Add document nodes with validation
    this.documents.forEach(doc => {
      if (doc && doc.metadata && doc.metadata.name) {
        nodes.push({
          id: doc.id,
          label: doc.metadata.name,
          type: 'document',
          size: doc.chunks ? doc.chunks.length : 0
        });
      }
    });

    // Calculate cross-document similarities
    for (let i = 0; i < this.documents.length; i++) {
      const doc1 = this.documents[i];
      if (!doc1 || !doc1.embeddings) continue;

      for (let j = i + 1; j < this.documents.length; j++) {
        const doc2 = this.documents[j];
        if (!doc2 || !doc2.embeddings) continue;

        const similarity = this.calculateDocumentSimilarity(
          doc1.embeddings,
          doc2.embeddings
        );

        if (similarity > 0.5) { // Only add edges for significant similarities
          edges.push({
            source: doc1.id,
            target: doc2.id,
            weight: similarity,
            type: 'similarity'
          });
        }
      }
    }

    // Add notes as concept nodes with validation
    this.notes.forEach(note => {
      if (note && note.content) {
        nodes.push({
          id: note.id,
          label: note.content.substring(0, 30) + '...',
          type: 'concept'
        });

        // Connect notes to documents
        edges.push({
          source: note.id,
          target: note.documentId,
          weight: 1,
          type: 'reference'
        });
      }
    });

    return { nodes, edges };
  }

  private calculateDocumentSimilarity(embeddings1: number[][], embeddings2: number[][]): number {
    // Calculate average embedding for each document
    const avg1 = this.calculateAverageEmbedding(embeddings1);
    const avg2 = this.calculateAverageEmbedding(embeddings2);

    // Calculate cosine similarity between average embeddings
    return tf.tensor1d(avg1)
      .dot(tf.tensor1d(avg2))
      .div(
        tf.norm(tf.tensor1d(avg1))
          .mul(tf.norm(tf.tensor1d(avg2)))
      )
      .dataSync()[0];
  }

  private calculateAverageEmbedding(embeddings: number[][]): number[] {
    const sum = embeddings.reduce((acc, curr) => {
      return acc.map((val, idx) => val + curr[idx]);
    });
    return sum.map(val => val / embeddings.length);
  }

  identifyTopics(): Map<string, string[]> {
    const topics = new Map<string, string[]>();
    
    this.documents.forEach(doc => {
      // Group similar chunks based on semantic similarity
      const clusters = this.clusterChunks(doc.chunks, doc.embeddings);
      topics.set(doc.id, clusters);
    });

    return topics;
  }

  private clusterChunks(chunks: string[], embeddings: number[][]): string[] {
    // Simple clustering based on similarity threshold
    const clusters: string[] = [];
    const assigned = new Set<number>();

    for (let i = 0; i < embeddings.length; i++) {
      if (assigned.has(i)) continue;

      const cluster = [chunks[i]];
      assigned.add(i);

      for (let j = i + 1; j < embeddings.length; j++) {
        if (assigned.has(j)) continue;

        const similarity = tf.tensor1d(embeddings[i])
          .dot(tf.tensor1d(embeddings[j]))
          .div(
            tf.norm(tf.tensor1d(embeddings[i]))
              .mul(tf.norm(tf.tensor1d(embeddings[j])))
          )
          .dataSync()[0];

        if (similarity > 0.8) { // High similarity threshold for topic clustering
          cluster.push(chunks[j]);
          assigned.add(j);
        }
      }

      clusters.push(this.generateTopicLabel(cluster));
    }

    return clusters;
  }

  private generateTopicLabel(chunks: string[]): string {
    // Simple topic label generation - use first sentence of first chunk
    const firstChunk = chunks[0];
    const firstSentence = firstChunk.split('.')[0];
    return firstSentence.length > 50 ? 
      firstSentence.substring(0, 47) + '...' : 
      firstSentence;
  }
}