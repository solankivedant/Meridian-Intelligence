import { db } from "@/lib/db";
import { safeQuery } from "@/lib/safeQuery";
import { Category, Region } from "@/lib/enums";
import { CATEGORY_META } from "@/lib/categoryMeta";
import { buildFeedWhere, type ParsedFeedParams } from "@/lib/feedQuery";
import type { FeedArticle } from "@/components/ArticleRow";

/**
 * How deep each section's box goes.
 *
 * The box shows two rows at a time, which is six stories on a wide screen and
 * two on a phone, so eighteen is between three and nine pages of paging without
 * a round trip. Deeper would mean shipping stories most readers never turn to;
 * the section's own page is one click away for anyone who wants all of them.
 */
export const BOARD_DEPTH = 18;

export type BoardGroup = {
  category: Category;
  /** Stories in this section under the current filters, not just those fetched. */
  total: number;
  articles: FeedArticle[];
};

/**
 * The archive as eight boxes rather than one ranked list.
 *
 * "Sort by section" used to order a single forty-story page by section, which
 * meant the busiest two sections ate the page and the other six were somewhere
 * on page three - the one thing a reader choosing "by section" is certainly not
 * asking for. Every section gets its own box instead, each showing its latest
 * stories two rows at a time, so the whole board is legible at once and no
 * section can crowd out another.
 *
 * One query per section rather than a windowed single query: eight indexed
 * eighteen-row reads run in parallel and stay readable, and the counts come
 * from one `groupBy` alongside them.
 */
export async function getSectionBoard(
  parsed: ParsedFeedParams,
  scope: { region?: Region } = {}
): Promise<BoardGroup[]> {
  const where = buildFeedWhere(parsed, scope);
  // A reader who has already picked sections gets a board of exactly those.
  const wanted = parsed.cats.length
    ? CATEGORY_META.filter((meta) => parsed.cats.includes(meta.category))
    : CATEGORY_META;

  const totalsQuery = safeQuery(
    () =>
      db.article.groupBy({
        by: ["category"],
        where,
        _count: { _all: true },
      }),
    [] as { category: Category; _count: { _all: number } }[]
  );

  const listsQuery = Promise.all(
    wanted.map((meta) =>
      safeQuery(
        () =>
          db.article.findMany({
            where: { ...where, category: meta.category },
            orderBy: { publishedAt: "desc" },
            include: { source: true },
            take: BOARD_DEPTH,
          }),
        [] as FeedArticle[]
      )
    )
  );

  const [totals, lists] = await Promise.all([totalsQuery, listsQuery]);
  const totalByCategory = new Map(totals.map((row) => [row.category, row._count._all]));

  return wanted
    .map((meta, i) => ({
      category: meta.category,
      total: totalByCategory.get(meta.category) ?? 0,
      articles: lists[i],
    }))
    // A section with nothing in the window is left off rather than drawn as an
    // empty box - eight empty frames say less than four full ones.
    .filter((group) => group.articles.length > 0);
}
