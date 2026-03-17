import { Injectable, Logger } from '@nestjs/common';

const GEMINI_EMBEDDING_MODEL = 'text-embedding-004';
const EMBEDDING_DIMENSIONS = 768;
const GEMINI_EMBEDDINGS_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBEDDING_MODEL}:embedContent`;

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  private getApiKey(): string {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    return apiKey;
  }

  async generateEmbedding(input: string): Promise<number[]> {
    this.logger.debug(`Embedding input: ${input}`);

    const apiKey = this.getApiKey();

    const response = await fetch(`${GEMINI_EMBEDDINGS_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: `models/${GEMINI_EMBEDDING_MODEL}`,
        content: {
          parts: [{ text: input }],
        },
      }),
    });

    this.logger.debug(`Gemini response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(
        `Gemini embeddings request failed with status ${response.status}. ${errorText}`.trim(),
      );
    }

    const data = (await response.json()) as {
      embedding?: { values?: number[] };
    };

    const embedding = data.embedding?.values;

    if (!embedding) {
      throw new Error('Gemini response missing embedding data');
    }

    this.logger.debug(`Embedding length: ${embedding.length}`);

    if (embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Embedding dimension mismatch. Expected ${EMBEDDING_DIMENSIONS}, got ${embedding.length}.`,
      );
    }

    return embedding;
  }
}