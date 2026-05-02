import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Link, Prisma } from '@prisma/client';
import * as cheerio from 'cheerio';
import { EmbeddingService } from '../common/embedding/embedding.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateLinkDto } from './dto/create-link.dto';

@Injectable()
export class LinksService {
  private readonly logger = new Logger(LinksService.name);
  private static readonly QUERY_EXPANSIONS: Record<string, string> = {
    dsa: 'data structures algorithms coding interview problems practice',
    cp: 'competitive programming contests algorithmic problem solving',
    ml: 'machine learning artificial intelligence neural network model training',
    os: 'operating systems linux kernel scheduling memory process management',
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async create(dto: CreateLinkDto) {
    try {
      this.logger.debug('Starting link create flow.');
      
      // Verify userId exists
      if (!dto.userId) {
        throw new Error('User ID is required');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
        select: { id: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const { metaDescription, title, contentText, extractedKeywords } =
        await this.scrapeUrl(dto.originalUrl);
      this.logger.debug('Metadata extraction completed.');

      const resolvedTitle = title ?? dto.title ?? null;
      const resolvedSummary = metaDescription ?? dto.summary ?? null;
      const resolvedRawText = contentText ?? dto.rawExtractedText ?? null;
      const resolvedKeywords = this.mergeKeywords(dto.keywords, extractedKeywords);

      const link = await this.prisma.link.create({
        data: {
          originalUrl: dto.originalUrl,
          title: resolvedTitle,
          summary: resolvedSummary,
          keywords: resolvedKeywords,
          rawExtractedText: resolvedRawText,
          userId: dto.userId,
        },
      });

      this.logger.debug('Embedding queued.');
      void this.enqueueEmbedding(
        link,
        resolvedTitle,
        resolvedSummary,
        resolvedKeywords,
        resolvedRawText,
      );

      return link;
    } catch (error) {
      this.logger.error('Failed to create link.', error instanceof Error ? error.stack : null);
      throw error;
    }
  }

  private async enqueueEmbedding(
    link: Link,
    title: string | null,
    summary: string | null,
    keywords: string[],
    contentText: string | null,
  ) {
    try {
      const input = this.buildEmbeddingInput({
        title,
        summary,
        keywords,
        rawExtractedText: contentText,
        originalUrl: link.originalUrl,
      });

      if (!input) {
        this.logger.warn(`No content to embed for link ${link.id}`);
        return;
      }

      this.logger.debug(`Starting embedding generation for link ${link.id}.`);
      const embedding = await this.embeddingService.generateEmbedding(input);

      await this.prisma.$executeRaw(
        Prisma.sql`
          UPDATE "Link"
          SET "embedding" = ARRAY[${Prisma.join(embedding)}]::vector
          WHERE "id" = ${link.id}
        `,
      );

      this.logger.debug(`Embedding stored for link ${link.id}.`);
    } catch (error) {
      this.logger.error(
        `Failed to generate embedding for link ${link.id}.`,
        error instanceof Error ? error.stack : null,
      );
    }
  }

  private async scrapeUrl(
    originalUrl: string,
  ): Promise<{
    metaDescription: string | null;
    title: string | null;
    contentText: string | null;
    extractedKeywords: string[];
  }> {
    try {
      const response = await fetch(originalUrl, {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          Accept: 'text/html',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
      });

      if (!response.ok) {
        this.logger.warn(`Content fetch failed with status ${response.status}.`);
        return {
          metaDescription: null,
          title: null,
          contentText: null,
          extractedKeywords: [],
        };
      }

      const html = await response.text();

      const $ = cheerio.load(html);
      $('script, style, noscript, svg, iframe').remove();

      const title =
        this.normalizeText($('meta[property="og:title"]').attr('content')) ||
        this.normalizeText($('meta[name="twitter:title"]').attr('content')) ||
        this.normalizeText($('title').first().text()) ||
        null;

      const metaDescription =
        this.normalizeText($('meta[property="og:description"]').attr('content')) ||
        this.normalizeText($('meta[name="description"]').attr('content')) ||
        this.normalizeText($('meta[name="twitter:description"]').attr('content')) ||
        null;

      const extractedKeywords = this.parseKeywords(
        this.normalizeText($('meta[name="keywords"]').attr('content')),
      );

      const contentText = this.extractMainText($);

      this.logger.debug(
        `Scrape extracted title=${Boolean(title)}, description=${Boolean(metaDescription)}, contentLength=${contentText?.length ?? 0}`,
      );

      return {
        metaDescription,
        title,
        contentText,
        extractedKeywords,
      };
    } catch (error) {
      this.logger.error(
        'Content extraction failed.',
        error instanceof Error ? error.stack : null,
      );
      return {
        metaDescription: null,
        title: null,
        contentText: null,
        extractedKeywords: [],
      };
    }
  }

  private normalizeText(value: string | undefined | null): string | null {
    if (!value) {
      return null;
    }

    const normalized = value.replace(/\s+/g, ' ').trim();
    return normalized.length > 0 ? normalized : null;
  }

  private parseKeywords(rawKeywords: string | null): string[] {
    if (!rawKeywords) {
      return [];
    }

    return rawKeywords
      .split(',')
      .map((keyword) => keyword.trim())
      .filter((keyword) => keyword.length > 1)
      .slice(0, 20);
  }

  private mergeKeywords(primary?: string[], secondary?: string[]): string[] {
    const merged = [...(primary ?? []), ...(secondary ?? [])]
      .map((keyword) => keyword.trim().toLowerCase())
      .filter((keyword) => keyword.length > 1);

    return Array.from(new Set(merged)).slice(0, 30);
  }

  private buildEmbeddingInput(params: {
    title?: string | null;
    summary?: string | null;
    keywords?: string[];
    rawExtractedText?: string | null;
    originalUrl: string;
  }): string {
    const keywordLine = params.keywords?.length ? params.keywords.join(' ') : null;
    const truncatedRaw = params.rawExtractedText?.trim().slice(0, 800) ?? null;

    return [
      params.title?.trim(),
      params.summary?.trim(),
      keywordLine,
      truncatedRaw,
      params.originalUrl.trim(),
    ]
      .filter((part): part is string => Boolean(part && part.length > 0))
      .join(' ')
      .slice(0, 12000);
  }

  private enrichQuery(query: string): string {
    const normalized = query.trim().toLowerCase();
    const expansion = LinksService.QUERY_EXPANSIONS[normalized];
    if (!expansion) {
      return query.trim();
    }

    return `${query.trim()} ${expansion}`.trim();
  }

  private extractMainText($: cheerio.CheerioAPI): string | null {
    const candidates: string[] = [];

    const articleLike = $('article, main, [role="main"]');
    articleLike.each((_, element) => {
      const text = this.normalizeText($(element).text());
      if (text) {
        candidates.push(text);
      }
    });

    $('p').each((_, element) => {
      const text = this.normalizeText($(element).text());
      if (text && text.length > 40) {
        candidates.push(text);
      }
    });

    const bodyText = this.normalizeText($('body').text());
    if (bodyText) {
      candidates.push(bodyText);
    }

    if (candidates.length === 0) {
      return null;
    }

    const best = candidates.sort((a, b) => b.length - a.length)[0];
    return best.slice(0, 12000);
  }

  async getAllLinks(userId: string) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const links = await this.prisma.link.findMany({
      where: { userId },
      select: {
        id: true,
        originalUrl: true,
        title: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    this.logger.debug(`Retrieved ${links.length} links for userId: ${userId}`);
    return links;
  }

  async deleteLink(id: string, userId: string) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const deleted = await this.prisma.link.deleteMany({
      where: {
        id,
        userId,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Link not found');
    }

    return { success: true, deletedCount: deleted.count };
  }

  async deleteAllLinks(userId: string) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const deleted = await this.prisma.link.deleteMany({
      where: { userId },
    });

    return { success: true, deletedCount: deleted.count };
  }

  async reprocessLink(linkId: string, userId: string) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!linkId) {
      throw new Error('Link ID is required');
    }

    const link = await this.prisma.link.findFirst({
      where: {
        id: linkId,
        userId,
      },
    });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    const { metaDescription, title, contentText, extractedKeywords } =
      await this.scrapeUrl(link.originalUrl);

    const combinedString = [
      title,
      metaDescription,
      extractedKeywords.join(' '),
      contentText?.slice(0, 800),
      link.originalUrl,
    ]
      .filter((part): part is string => Boolean(part && part.length > 0))
      .join(' ');

    const embedding = await this.embeddingService.generateEmbedding(combinedString);

    await this.prisma.link.update({
      where: { id: link.id },
      data: {
        title,
        summary: metaDescription,
        keywords: extractedKeywords,
        rawExtractedText: contentText,
      },
    });

    await this.prisma.$executeRaw(
      Prisma.sql`
        UPDATE "Link"
        SET "embedding" = ARRAY[${Prisma.join(embedding)}]::vector
        WHERE "id" = ${link.id}
      `,
    );

    return { success: true, linkId: link.id };
  }

  async semanticSearch(query: string, userId: string) {
    const input = query.trim();
    if (!input) {
      return [] as LinkSearchResult[];
    }

    const wordCount = input.trim().split(/\s+/).length;
    const isShortQuery = wordCount <= 2;
    const enrichedQuery = this.enrichQuery(input);
    const vectorWeight = 0.8;
    const keywordWeight = 0.2;
    const vectorSimilarityCutoff = isShortQuery ? 0.35 : 0.45;
    const minimumScore = isShortQuery ? 0.40 : 0.45;
    const strongVectorCutoff = isShortQuery ? 0.5 : 0.6;

    const embedding = await this.embeddingService.generateEmbedding(enrichedQuery);
    this.logger.debug(
      `Generated embedding with ${embedding.length} dimensions for query: "${input}" (enriched="${enrichedQuery}")`,
    );

    const rawResults = await this.prisma.$queryRaw<LinkSearchResult[]>(
      Prisma.sql`
        WITH candidate_links AS (
          SELECT
            "id",
            "userId",
            "originalUrl",
            "title",
            CASE
              WHEN "embedding" IS NULL THEN NULL
              ELSE 1 - ("embedding" <=> ARRAY[${Prisma.join(embedding)}]::vector)
            END AS "vector_similarity",
            ts_rank_cd(
              to_tsvector(
                'simple',
                concat_ws(
                  ' ',
                  coalesce("title", ''),
                  coalesce("summary", ''),
                  coalesce("rawExtractedText", ''),
                  array_to_string("keywords", ' '),
                  coalesce("originalUrl", '')
                )
              ),
              COALESCE(
                NULLIF(websearch_to_tsquery('simple', ${input}), to_tsquery('')),
                plainto_tsquery('simple', ${input})
              )
            ) AS "keyword_rank"
          FROM "Link"
          WHERE "userId" = ${userId}
        ),
        scored_links AS (
          SELECT
            "id",
            "userId",
            "originalUrl",
            "title",
            (
              COALESCE("vector_similarity", 0) * ${vectorWeight}
              + LEAST("keyword_rank", 1.0) * ${keywordWeight}
            ) AS "score"
          FROM candidate_links
          WHERE
            "vector_similarity" IS NOT NULL
            AND "vector_similarity" > ${vectorSimilarityCutoff}
            AND (
              "keyword_rank" > 0
              OR "vector_similarity" > ${strongVectorCutoff}
            )
        )
        SELECT
          "id",
          "userId",
          "originalUrl",
          "title",
          "score"
        FROM scored_links
        WHERE "score" >= ${minimumScore}
        ORDER BY "score" DESC
        LIMIT 10
      `,
    );
    this.logger.debug(`Search returned ${rawResults.length} results for userId: ${userId}`);
    if (rawResults.length > 0) {
      this.logger.debug(`Top result: ${rawResults[0].originalUrl}, score: ${rawResults[0].score}`);
    }

    const cliffFiltered = applyScoreCliff(rawResults, 0.07, 0.35);
    const spreadFiltered = applyScoreSpread(cliffFiltered, 0.25);
    return applyTopScoreRatio(spreadFiltered, 0.65);
  }

  async reprocessAllLinks(userId: string) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const links = await this.prisma.link.findMany({
      where: { userId },
      select: {
        id: true,
        originalUrl: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    let processedCount = 0;
    let failedCount = 0;

    this.logger.log(
      `Starting reprocessing of ${links.length} links for userId: ${userId}`,
    );

    for (let index = 0; index < links.length; index += 1) {
      const link = links[index];
      try {
        await this.reprocessLink(link.id, userId);

        processedCount += 1;
        this.logger.debug(
          `Reprocessed link ${link.id} (${processedCount}/${links.length})`,
        );
      } catch (error) {
        failedCount += 1;
        this.logger.error(
          `Failed to reprocess ${link.originalUrl}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      if (index < links.length - 1) {
        await this.delay(500);
      }
    }

    this.logger.log(
      `Reprocessing complete for userId: ${userId}. Processed: ${processedCount}, Failed: ${failedCount}`,
    );

    return {
      total: links.length,
      processedCount,
      failedCount,
    };
  }

  private delay(ms: number) {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}

function applyScoreCliff(
  results: LinkSearchResult[],
  minDrop = 0.07,
  relativeFactor = 0.35,
): LinkSearchResult[] {
  if (results.length <= 1) {
    return results;
  }

  const topScore = results[0].score;

  for (let index = 1; index < results.length; index += 1) {
    const drop = results[index - 1].score - results[index].score;
    const relativeDropThreshold = topScore * relativeFactor;

    if (drop >= minDrop && drop >= relativeDropThreshold) {
      return results.slice(0, index);
    }
  }

  return results;
}

function applyScoreSpread(
  results: LinkSearchResult[],
  maxSpread = 0.15,
): LinkSearchResult[] {
  if (results.length <= 1) return results;
  const topScore = results[0].score;
  const floor = topScore - maxSpread;
  const filtered = results.filter(r => r.score >= floor);
  return filtered.length > 0 ? filtered : results.slice(0, 1);
}

function applyTopScoreRatio(
  results: LinkSearchResult[],
  ratio = 0.72,
): LinkSearchResult[] {
  if (results.length <= 1) return results;
  const topScore = results[0].score;
  const floor = topScore * ratio;
  const filtered = results.filter(r => r.score >= floor);
  return filtered.length > 0 ? filtered : results.slice(0, 1);
}

type LinkSearchResult = Pick<
  Link,
  | 'id'
  | 'originalUrl'
  | 'title'
> & { score: number };
