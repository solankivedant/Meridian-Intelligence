import { Prisma } from "@prisma/client";
import { Category, Region } from "@/lib/enums";
import { db } from "@/lib/db";
import { MAX_QUERY_LENGTH } from "@/lib/searchLimits";
import type { FeedArticle } from "@/components/ArticleRow";

/**
 * Full-text search over the archive.
 *
 * Prisma's query builder can't reach Postgres' `tsvector` operators, so this
 * drops to raw SQL. The expression matches the GIN index created in
 * `20260818020834_region_and_search` exactly - change one and you must change
 * the other, or every search silently becomes a sequential scan over tens of
 * thousands of rows.
 */
const MATCH_EXPRESSION = Prisma.sql`to_tsvector('english', a."title" || ' ' || a."excerpt")`;

export { MAX_QUERY_LENGTH };

/**
 * How the words in a query relate to each other.
 *
 *  - `all`    every word must appear, anywhere in the story. Search-box
 *             semantics, and the default.
 *  - `any`    at least one word appears. Widens a query that returned little;
 *             also what the topic desk uses to gather candidates.
 *  - `exact`  the words appear together, in the order typed. Postgres' phrase
 *             operator, so "reserve bank" stops matching a story that says
 *             "reserve" in one paragraph and "bank" in another.
 */
export type MatchMode = "all" | "any" | "exact";

export const MATCH_MODES: { key: MatchMode; label: string; hint: string }[] = [
  { key: "all", label: "All words", hint: "Every word appears somewhere in the story" },
  { key: "any", label: "Any word", hint: "At least one of the words appears - a wider net" },
  { key: "exact", label: "Exact phrase", hint: "The words together, in the order typed" },
];

export function isMatchMode(value: string | undefined): value is MatchMode {
  return MATCH_MODES.some((mode) => mode.key === value);
}

/**
 * Turns free text into a tsquery.
 *
 * In `all` and `any` every term gets a `:*` prefix wildcard so partial words
 * match while typing - "semicon" should find "semiconductor". `exact` drops the
 * wildcards and joins with `<->`, Postgres' "immediately followed by" operator:
 * a reader who asked for a phrase asked for the phrase, and a trailing wildcard
 * would quietly widen it again.
 *
 * Input is reduced to alphanumerics first: `to_tsquery` throws on stray
 * operators, and a thrown query is a 500.
 */
export function toTsQuery(input: string, mode: MatchMode = "all"): string | null {
  const terms = input
    .slice(0, MAX_QUERY_LENGTH)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length > 1)
    .slice(0, 8);

  if (terms.length === 0) return null;
  if (mode === "exact") return terms.join(" <-> ");
  return terms.map((term) => `${term}:*`).join(mode === "any" ? " | " : " & ");
}

export type SearchFilters = {
  region?: Region;
  category?: Category;
  tags?: string[];
  /** Only stories published on or after this instant. */
  since?: Date;
};

export type SearchResults = {
  articles: FeedArticle[];
  total: number;
};

type SearchRow = {
  id: string;
  title: string;
  excerpt: string;
  url: string;
  category: Category;
  tags: string[];
  publishedAt: Date;
  sourceName: string;
  likes: number;
};

function filterConditions(filters: SearchFilters): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = [];
  if (filters.region) {
    conditions.push(Prisma.sql`a."region" = ${filters.region}::"Region"`);
  }
  if (filters.category) {
    conditions.push(Prisma.sql`a."category" = ${filters.category}::"Category"`);
  }
  if (filters.tags?.length) {
    conditions.push(Prisma.sql`a."tags" && ${filters.tags}::text[]`);
  }
  if (filters.since) {
    conditions.push(Prisma.sql`a."publishedAt" >= ${filters.since}`);
  }
  return conditions;
}

export async function searchArticles(
  rawQuery: string,
  filters: SearchFilters,
  { skip = 0, take = 30, mode = "all" }: { skip?: number; take?: number; mode?: MatchMode } = {}
): Promise<SearchResults> {
  const tsQuery = toTsQuery(rawQuery, mode);
  if (!tsQuery) return { articles: [], total: 0 };

  const where = Prisma.join(
    [
      Prisma.sql`${MATCH_EXPRESSION} @@ to_tsquery('english', ${tsQuery})`,
      ...filterConditions(filters),
    ],
    " AND "
  );

  // Relevance first, recency as the tiebreak: a search for "semiconductor
  // policy" should surface the pieces actually about that, not simply the
  // newest story that happens to contain both words.
  const [rows, totals] = await Promise.all([
    db.$queryRaw<SearchRow[]>`
      SELECT a."id", a."title", a."excerpt", a."url", a."category", a."tags",
             a."publishedAt", a."likes", s."name" AS "sourceName"
      FROM "Article" a
      JOIN "Source" s ON s."id" = a."sourceId"
      WHERE ${where}
      ORDER BY ts_rank(${MATCH_EXPRESSION}, to_tsquery('english', ${tsQuery})) DESC,
               a."publishedAt" DESC
      LIMIT ${take} OFFSET ${skip}
    `,
    db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count FROM "Article" a WHERE ${where}
    `,
  ]);

  return {
    articles: rows.map((row) => ({
      id: row.id,
      title: row.title,
      excerpt: row.excerpt,
      url: row.url,
      category: row.category,
      tags: row.tags,
      publishedAt: row.publishedAt,
      likes: row.likes,
      source: { name: row.sourceName },
    })),
    total: Number(totals[0]?.count ?? 0),
  };
}
