import { Prisma } from "@prisma/client";
import { Category, Region } from "@/lib/enums";
import { db } from "@/lib/db";
import { MAX_QUERY_LENGTH } from "@/lib/searchLimits";
import { queryTerms, termVariants } from "@/lib/searchTerms";
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
  {
    key: "all",
    label: "All words",
    hint: "Every word appears somewhere in the story - joined-up spellings included",
  },
  {
    key: "any",
    label: "Any word",
    hint: "At least one word appears; the stories carrying the most of them come first",
  },
  { key: "exact", label: "Exact phrase", hint: "The words together, in the order typed" },
];

export function isMatchMode(value: string | undefined): value is MatchMode {
  return MATCH_MODES.some((mode) => mode.key === value);
}

/**
 * Turns free text into a tsquery.
 *
 * In `all` and `any` every term carries a `:*` prefix wildcard so partial words
 * match while typing - "semicon" should find "semiconductor". `exact` drops the
 * wildcards: a reader who asked for a phrase asked for the phrase, and a
 * trailing wildcard would quietly widen it again.
 *
 * `all` and `exact` are built from `termVariants`, so a query is satisfied by
 * any of the ways it could have been written - "semi conductor" is answered by
 * a story that says "semiconductor" as readily as by one that spaces it out.
 * See `lib/searchTerms.ts` for why that is not something Postgres does on its
 * own. `any` needs no variants: it is already satisfied by "semi" alone, and
 * "semi" is a prefix of the compound.
 */
export function toTsQuery(input: string, mode: MatchMode = "all"): string | null {
  const terms = queryTerms(input);
  if (terms.length === 0) return null;

  // `any` ORs every form of every word, compounds included. Without the
  // compounds it could return *fewer* stories than `all` - "e commerce" would
  // ask only for "commerce" and miss the 23 stories spelling it "ecommerce",
  // which the wider of two settings has no business doing.
  if (mode === "any") {
    return [...new Set(termVariants(input).flat())].map((term) => `${term}:*`).join(" | ");
  }

  const join = mode === "exact" ? " <-> " : " & ";
  const decorate = (term: string) => (mode === "exact" ? term : `${term}:*`);

  const variants = termVariants(input).map((variant) => variant.map(decorate).join(join));
  return variants.length === 1 ? variants[0] : variants.map((v) => `(${v})`).join(" | ");
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
  const terms = queryTerms(rawQuery);

  const where = Prisma.join(
    [
      Prisma.sql`${MATCH_EXPRESSION} @@ to_tsquery('english', ${tsQuery})`,
      ...filterConditions(filters),
    ],
    " AND "
  );

  /**
   * How many of the query's words a story actually carries.
   *
   * `any` returns everything holding at least one word, which for "reserve
   * bank" is every story that mentions a bank - and a relevance score alone
   * does not reliably float the ones holding *both* to the top. Counting the
   * words present is the plain reading of the question the reader asked: two
   * out of two beats one out of two, whatever else the ranker thinks. The
   * other two modes need none of this - `all` means every story already has
   * every word.
   */
  const wordsPresent =
    mode === "any" && terms.length > 1
      ? Prisma.join(
          terms.map(
            (term) =>
              Prisma.sql`(CASE WHEN ${MATCH_EXPRESSION} @@ to_tsquery('english', ${`${term}:*`}) THEN 1 ELSE 0 END)`
          ),
          " + "
        )
      : null;

  // Words present first where that means anything, then relevance, then
  // recency: a search should surface the pieces actually about the thing, not
  // simply the newest story that happens to contain one of the words.
  const orderBy = Prisma.join(
    [
      ...(wordsPresent ? [Prisma.sql`(${wordsPresent}) DESC`] : []),
      Prisma.sql`ts_rank(${MATCH_EXPRESSION}, to_tsquery('english', ${tsQuery})) DESC`,
      Prisma.sql`a."publishedAt" DESC`,
    ],
    ", "
  );

  const [rows, totals] = await Promise.all([
    db.$queryRaw<SearchRow[]>`
      SELECT a."id", a."title", a."excerpt", a."url", a."category", a."tags",
             a."publishedAt", a."likes", s."name" AS "sourceName"
      FROM "Article" a
      JOIN "Source" s ON s."id" = a."sourceId"
      WHERE ${where}
      ORDER BY ${orderBy}
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
