import { CONFIGURED_SOURCE_NAMES } from "./ingestion/sources";
import { deck } from "./deck";
import type { FeedArticle } from "@/components/ArticleRow";

/**
 * Picks which story gets the large treatment.
 *
 * "Newest" is the wrong answer: the most recent item is often a one-line wire
 * stub or a tax-tribunal note, and giving it a 38px headline makes the page
 * open on noise. Scoring instead prefers a story with a real deck to quote,
 * from a feed we curate rather than one the archive crawl happened to surface,
 * while still keeping the choice near the top of the window.
 */
// Regulators publish a steady drip of procedural notices — auction results,
// money-market operations, numbered circulars, enforcement orders against
// named individuals. They belong in the feed, but they are never the story a
// reader should open on.
const ROUTINE_TITLE =
  /^(result of|money market operations|auction|reserve money|rbi bulletin|weekly statistical|daily|minutes of|list of|general remittance|order dated|notice under)\b|\b(auction held on|as on \d|press release:|notification no|circular no|recovery certificate|in the matter of|adjudication order|settlement order|show cause notice)\b/i;

/** Share of characters that are digits — high in tables, low in prose. */
function digitDensity(text: string): number {
  if (!text) return 0;
  let digits = 0;
  for (const ch of text) if (ch >= "0" && ch <= "9") digits++;
  return digits / text.length;
}

function score(article: FeedArticle, index: number, poolSize: number): number {
  let total = 0;

  // A deck to quote is worth a lot — but only a real one. `deck()` rejects
  // descriptions that merely restate the headline, and a pasted table reads as
  // noise at display size no matter how long it is.
  const excerpt = deck(article.title, article.excerpt);
  if (!excerpt) {
    // Weighted to outrank recency outright. A regulator can file thirty
    // deckless notices in one minute, and without this the freshest of them
    // would take the lead every time.
    total -= 3;
  } else if (digitDensity(excerpt) < 0.12) {
    if (excerpt.length > 160) total += 3;
    else if (excerpt.length > 60) total += 1.5;
  }

  if (ROUTINE_TITLE.test(article.title)) total -= 4;

  if (CONFIGURED_SOURCE_NAMES.has(article.source.name)) total += 2;
  if (article.tags.length > 0) total += 0.5;

  // Recency, as a gentle gradient rather than a hard tiebreak.
  total += (1 - index / Math.max(poolSize - 1, 1)) * 2.5;

  return total;
}

/**
 * Index of the best lead candidate within the first `window` articles. The
 * window is wide enough to see past a single publisher's bulk drop — SEBI and
 * PIB routinely file twenty-plus items within the same minute.
 */
export function pickLeadIndex(articles: FeedArticle[], window = 40): number {
  const pool = Math.min(articles.length, window);
  if (pool === 0) return -1;

  let bestIndex = 0;
  let bestScore = -Infinity;
  for (let i = 0; i < pool; i++) {
    const value = score(articles[i], i, pool);
    if (value > bestScore) {
      bestScore = value;
      bestIndex = i;
    }
  }
  return bestIndex;
}

/** Moves the chosen lead to the front, preserving the order of the rest. */
export function withLeadFirst(articles: FeedArticle[]): {
  lead?: FeedArticle;
  rest: FeedArticle[];
} {
  const index = pickLeadIndex(articles);
  if (index < 0) return { rest: [] };
  return {
    lead: articles[index],
    rest: articles.filter((_, i) => i !== index),
  };
}
