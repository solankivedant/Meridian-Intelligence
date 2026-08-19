import { Category, Region, SourceType } from "@/lib/enums";
import { db } from "@/lib/db";
import { categorize } from "@/lib/categorize";
import { RSS_SOURCES, NEWSDATA_SOURCE } from "./sources";
import { fetchRssArticles } from "./rss";
import { fetchNewsDataArticles } from "./newsdata";
import { ARCHIVE_QUERIES, ArchiveQuery, fetchGoogleNews } from "./googleNews";
import { titleKey } from "./dedupe";
import { RawArticle, SourceConfig } from "./types";

/**
 * Retries a database call through transient disconnects. Hosted Postgres will
 * drop a pooled connection under a long crawl; losing an hour of progress to
 * one closed socket is not an acceptable failure mode for a batch job.
 */
async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      console.warn(`${label} failed (attempt ${attempt + 1}/${attempts}):`, err);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/**
 * Resolves source names to ids, memoized for the lifetime of a run.
 *
 * The archive crawl discovers hundreds of publishers, so this deliberately
 * avoids an upsert per name: a batch resolves its unknown publishers with one
 * `createMany` plus one `findMany`. Firing fifty concurrent upserts instead
 * exhausted the connection pool and got the server to hang up mid-crawl.
 */
export class SourceCache {
  private ids = new Map<string, string>();

  idOf(name: string): string | undefined {
    return this.ids.get(name);
  }

  /** Upserts one configured feed, keeping its url and type current. */
  async idForFeed(config: SourceConfig): Promise<string> {
    const cached = this.ids.get(config.name);
    if (cached) return cached;

    const source = await withRetry(`Source upsert (${config.name})`, () =>
      db.source.upsert({
        where: { name: config.name },
        update: { url: config.url, type: config.type, region: config.region },
        create: {
          name: config.name,
          url: config.url,
          type: config.type,
          defaultCategory: config.defaultCategory,
          region: config.region,
        },
      })
    );

    this.ids.set(config.name, source.id);
    return source.id;
  }

  /** Ensures every named source exists, creating the unknown ones in one write. */
  async resolveAll(configs: SourceConfig[]): Promise<void> {
    const missing = [
      ...new Map(
        configs.filter((c) => !this.ids.has(c.name)).map((c) => [c.name, c])
      ).values(),
    ];
    if (missing.length === 0) return;

    await withRetry("Source createMany", () =>
      db.source.createMany({
        data: missing.map((c) => ({
          name: c.name,
          url: c.url,
          type: c.type,
          defaultCategory: c.defaultCategory,
          region: c.region,
        })),
        skipDuplicates: true,
      })
    );

    const rows = await withRetry("Source lookup", () =>
      db.source.findMany({
        where: { name: { in: missing.map((c) => c.name) } },
        select: { id: true, name: true },
      })
    );
    for (const row of rows) this.ids.set(row.name, row.id);
  }
}

// Publishers surfaced by the Google News archive crawl become first-class
// Source rows so attribution on the card is the actual newsroom, not "Google
// News". Their `url` points at that publisher's Google News channel search.
function publisherConfig(
  publisher: string,
  defaultCategory: Category,
  region: Region
): SourceConfig {
  return {
    name: publisher,
    url: `https://news.google.com/search?q=${encodeURIComponent(publisher)}`,
    type: SourceType.RSS,
    defaultCategory,
    region,
  };
}

export type IngestOptions = {
  /** Normalized titles already present; mutated as new articles are accepted. */
  seenTitles?: Set<string>;
  /** Attribute each item to its own publisher rather than the feed. */
  attributeToPublisher?: boolean;
};

export type IngestCounts = { created: number; skipped: number; duplicate: number };

/**
 * Filters a feed's items down to what's genuinely new, then writes them in one
 * statement.
 *
 * The obvious shape here is an upsert per article, and that is what this did
 * first - but a historical crawl moves ~800 items per month of archive, and a
 * round trip each turned a five-minute job into a multi-hour one. Everything
 * that can be decided locally (categorization, in-batch URL collisions,
 * headline dedupe) is decided before touching the database, and the survivors
 * go out as a single `createMany`; the unique index on `url` remains the last
 * word on duplicates.
 */
export async function ingestArticles(
  sources: SourceCache,
  config: SourceConfig,
  items: RawArticle[],
  options: IngestOptions = {}
): Promise<IngestCounts> {
  const { seenTitles, attributeToPublisher } = options;
  let skipped = 0;
  let duplicate = 0;

  const seenUrls = new Set<string>();
  const accepted: {
    item: RawArticle;
    category: Category;
    tags: string[];
    config: SourceConfig;
  }[] = [];

  for (const item of items) {
    if (!item.title || !item.url) continue;

    const { category, tags, matched } = categorize(
      item.title,
      item.excerpt,
      config.defaultCategory
    );
    if (config.strict && !matched) {
      skipped++;
      continue;
    }

    // A single archive response can repeat a URL across its result pages.
    if (seenUrls.has(item.url)) {
      duplicate++;
      continue;
    }
    seenUrls.add(item.url);

    if (seenTitles) {
      const key = titleKey(item.title);
      if (seenTitles.has(key)) {
        duplicate++;
        continue;
      }
      seenTitles.add(key);
    }

    accepted.push({
      item,
      category,
      tags,
      config:
        attributeToPublisher && item.publisher
          ? publisherConfig(item.publisher, config.defaultCategory, config.region)
          : config,
    });
  }

  if (accepted.length === 0) return { created: 0, skipped, duplicate };

  await sources.resolveAll(accepted.map((a) => a.config));

  const rows = accepted.flatMap(({ item, category, tags, config: sourceConfig }) => {
    const sourceId = sources.idOf(sourceConfig.name);
    // A source that failed to resolve would take the whole batch down on a
    // null foreign key; dropping the row keeps the rest of the feed.
    if (!sourceId) return [];
    return [
      {
        title: item.title.slice(0, 500),
        excerpt: item.excerpt.slice(0, 2000),
        url: item.url,
        category,
        region: config.region,
        tags,
        publishedAt: item.publishedAt,
        sourceId,
      },
    ];
  });

  try {
    const { count } = await withRetry(`Article batch (${config.name})`, () =>
      db.article.createMany({ data: rows, skipDuplicates: true })
    );
    return { created: count, skipped, duplicate: duplicate + (rows.length - count) };
  } catch (err) {
    console.error(`Failed to ingest batch from ${config.name}:`, err);
    return { created: 0, skipped, duplicate };
  }
}

export type IngestSummary = {
  source: string;
  fetched: number;
  created: number;
  skipped?: number;
  duplicate?: number;
  error?: string;
};

/** Normalized titles for everything published since `since`, for dedupe. */
export async function loadRecentTitleKeys(since: Date): Promise<Set<string>> {
  const rows = await withRetry("Title-key load", () =>
    db.article.findMany({
      where: { publishedAt: { gte: since } },
      select: { title: true },
    })
  );
  return new Set(rows.map((r) => titleKey(r.title)));
}

const GOOGLE_NEWS_RECENT_DAYS = 7;

/** The synthetic feed a Google News archive query writes through. */
export function archiveSourceConfig(query: ArchiveQuery): SourceConfig {
  const desk = query.region === Region.INDIA ? "India" : "World";
  return {
    name: `Google News ${desk} - ${query.label}`,
    url: "https://news.google.com/",
    type: SourceType.API,
    defaultCategory: query.category,
    region: query.region,
  };
}

export async function runIngestion(): Promise<IngestSummary[]> {
  const summaries: IngestSummary[] = [];
  const sources = new SourceCache();
  // Feeds overlap heavily (five outlets carry the same PTI copy), so dedupe
  // across the whole run against the last month of stored headlines.
  const seenTitles = await loadRecentTitleKeys(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );

  for (const config of RSS_SOURCES) {
    try {
      // Resolved explicitly so a feed whose url or type changed in sources.ts
      // gets updated - the batch path only ever creates rows.
      await sources.idForFeed(config);
      const items = await fetchRssArticles(config);
      const counts = await ingestArticles(sources, config, items, { seenTitles });
      summaries.push({ source: config.name, fetched: items.length, ...counts });
    } catch (err) {
      summaries.push({
        source: config.name,
        fetched: 0,
        created: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Same archive queries as the backfill, but windowless - this keeps the
  // long tail of publishers flowing in on every scheduled run, not just
  // during a one-off historical crawl.
  const recentWindow = {
    after: new Date(Date.now() - GOOGLE_NEWS_RECENT_DAYS * 24 * 60 * 60 * 1000),
    before: new Date(Date.now() + 24 * 60 * 60 * 1000),
  };
  for (const query of ARCHIVE_QUERIES) {
    const config = archiveSourceConfig(query);
    try {
      const items = await fetchGoogleNews(query.query, query.region, recentWindow);
      const counts = await ingestArticles(sources, config, items, {
        seenTitles,
        attributeToPublisher: true,
      });
      summaries.push({ source: config.name, fetched: items.length, ...counts });
    } catch (err) {
      summaries.push({
        source: config.name,
        fetched: 0,
        created: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (process.env.NEWSDATA_API_KEY) {
    try {
      const items = await fetchNewsDataArticles();
      const counts = await ingestArticles(sources, NEWSDATA_SOURCE, items, { seenTitles });
      summaries.push({ source: NEWSDATA_SOURCE.name, fetched: items.length, ...counts });
    } catch (err) {
      summaries.push({
        source: NEWSDATA_SOURCE.name,
        fetched: 0,
        created: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return summaries;
}
