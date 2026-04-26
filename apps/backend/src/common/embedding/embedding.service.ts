import { Injectable, Logger } from '@nestjs/common';

const DEFAULT_EMBEDDING_MODEL = 'gemini-embedding-001';
const FALLBACK_EMBEDDING_MODELS = ['text-embedding-004', 'embedding-001'];
const EMBEDDING_DIMENSIONS = 768;
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  private getEmbeddingModels(): string[] {
    const configuredPrimary = process.env.GEMINI_EMBEDDING_MODEL?.trim();
    const primaryModel = configuredPrimary || DEFAULT_EMBEDDING_MODEL;

    return [primaryModel, ...FALLBACK_EMBEDDING_MODELS].filter(
      (model, index, allModels) => model.length > 0 && allModels.indexOf(model) === index,
    );
  }

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

    let lastError: Error | null = null;

    for (const model of this.getEmbeddingModels()) {
      const response = await fetch(`${GEMINI_API_BASE_URL}/${model}:embedContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: `models/${model}`,
          content: {
            parts: [{ text: input }],
          },
          outputDimensionality: EMBEDDING_DIMENSIONS,
        }),
      });

      this.logger.debug(`Gemini response status for model ${model}: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        const errorMessage = `Gemini embeddings request failed for model ${model} with status ${response.status}. ${errorText}`.trim();

        // Some accounts/projects cannot access every embedding model. Try fallbacks on 404/400.
        if (response.status === 404 || response.status === 400) {
          this.logger.warn(errorMessage);
          lastError = new Error(errorMessage);
          continue;
        }

        throw new Error(errorMessage);
      }

      const data = (await response.json()) as {
        embedding?: { values?: number[] };
      };

      const embedding = data.embedding?.values;

      if (!embedding) {
        throw new Error(`Gemini response missing embedding data for model ${model}`);
      }

      this.logger.debug(`Embedding length from model ${model}: ${embedding.length}`);

      if (embedding.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(
          `Embedding dimension mismatch for model ${model}. Expected ${EMBEDDING_DIMENSIONS}, got ${embedding.length}.`,
        );
      }

      return embedding;
    }

    throw lastError ?? new Error('No embedding model succeeded');
  }
}