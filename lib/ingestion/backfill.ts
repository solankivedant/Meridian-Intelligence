import { Region } from "@/lib/enums";
import { ARCHIVE_QUERIES, fetchGoogleNews } from "./googleNews";
import { SourceCache, archiveSourceConfig, ingestArticles, loadRecentTitleKeys } from "./run";

// Google News tolerates a steady crawl but will start returning empty feeds if
// hammered, so windows are fetched one at a time with a short pause.
const REQUEST_DELAY_MS = 400;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type MonthWindow = { key: string; after: Date; before: Date };

/** Calendar months from `monthsBack` ago through the current month, newest first. */
export function monthWindows(monthsBack: number): MonthWindow[] {
  const now = new Date();
  const windows: MonthWindow[] = [];
  for (let i = 0; i <= monthsBack; i++) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    windows.push({
      key: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`,
      after: start,
      before: end,
    });
  }
  return windows;
}

export type BackfillResult = {
  month: string;
  desk: string;
  query: string;
  fetched: number;
  created: number;
  skipped: number;
  duplicate: number;
  error?: string;
};

export type BackfillOptions = {
  /** How many months of history to crawl, in addition to the current one. */
  monthsBack: number;
  /** Restrict to specific archive query keys; defaults to all of them. */
  queryKeys?: string[];
  /** Restrict to one desk; defaults to crawling both. */
  region?: Region;
  onProgress?: (result: BackfillResult) => void;
};

/**
 * Crawls the Google News dated archive month by month. This is what gives the
 * dashboard real history - RSS feeds only ever expose a publisher's latest few
 * dozen items, which is why the feed otherwise starts at "a few days ago".
 */
export async function runBackfill(options: BackfillOptions): Promise<BackfillResult[]> {
  const { monthsBack, queryKeys, region, onProgress } = options;
  const queries = ARCHIVE_QUERIES.filter(
    (q) =>
      (!queryKeys?.length || queryKeys.includes(q.key)) &&
      (!region || q.region === region)
  );

  const windows = monthWindows(monthsBack);
  const sources = new SourceCache();
  // One dedupe set spanning the whole crawl: the same story surfaces under
  // several archive queries, and near-duplicates cluster within a month.
  const oldest = windows[windows.length - 1]?.after ?? new Date(0);
  const seenTitles = await loadRecentTitleKeys(oldest);

  const results: BackfillResult[] = [];

  for (const window of windows) {
    for (const query of queries) {
      const config = archiveSourceConfig(query);
      const desk = query.region === Region.INDIA ? "IN" : "WW";

      let result: BackfillResult;
      try {
        const items = await fetchGoogleNews(query.query, query.region, window);
        const counts = await ingestArticles(sources, config, items, {
          seenTitles,
          attributeToPublisher: true,
        });
        result = { month: window.key, desk, query: query.key, fetched: items.length, ...counts };
      } catch (err) {
        result = {
          month: window.key,
          desk,
          query: query.key,
          fetched: 0,
          created: 0,
          skipped: 0,
          duplicate: 0,
          error: err instanceof Error ? err.message : String(err),
        };
      }

      results.push(result);
      onProgress?.(result);
      await sleep(REQUEST_DELAY_MS);
    }
  }

  return results;
}
