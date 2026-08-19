import { ArticleGrid } from "./ArticleGrid";
import type { FeedArticle } from "./ArticleRow";
import { withLeadFirst } from "@/lib/leadStory";
import { metaForCategory } from "@/lib/categoryMeta";
import { Category } from "@/lib/enums";

type SectionGroup = {
  category: Category;
  articles: FeedArticle[];
  /** Number the first tile of this section carries. */
  start: number;
};

/**
 * The feed grouped by section rather than by day.
 *
 * This is what "sort by section" is actually for. Ordering the rows by section
 * without grouping them would produce a feed with invisible seams — the eye
 * cannot see where one section ends in a three-column mosaic. Because the query
 * already orders by section and then by date, a single pass is enough: a new
 * group starts wherever the section changes.
 *
 * Numbering runs across the whole feed, as it does everywhere else: a tile's
 * number is its position in the list the reader asked for, not within its group.
 */
function groupBySection(articles: FeedArticle[], startIndex: number): SectionGroup[] {
  const groups: SectionGroup[] = [];
  let current: SectionGroup | undefined;
  let cursor = startIndex;

  for (const article of articles) {
    if (!current || current.category !== article.category) {
      current = { category: article.category, articles: [], start: cursor };
      groups.push(current);
    }
    current.articles.push(article);
    cursor++;
  }

  return groups;
}

export function SectionFeed({
  articles,
  startIndex = 1,
}: {
  articles: FeedArticle[];
  /** Number the first tile carries. Pages continue the count, e.g. 41 on p2. */
  startIndex?: number;
}) {
  const groups = groupBySection(articles, startIndex);

  return (
    <div className="flex flex-col gap-10">
      {groups.map((group) => {
        const meta = metaForCategory(group.category);
        const accent = `var(${meta.colorVar})`;
        // Each section still leads with its strongest story rather than its
        // latest — same reasoning as the page lead (see lib/leadStory.ts).
        const { lead: feature, rest } = withLeadFirst(group.articles);
        if (!feature) return null;

        return (
          <section key={group.category}>
            <div
              className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b pb-2"
              style={{ borderColor: accent }}
            >
              <span
                className="h-2 w-2 shrink-0 self-center rounded-full"
                style={{ backgroundColor: accent }}
                aria-hidden
              />
              <h3 className="headline shrink-0 text-[19px] leading-none text-[var(--text-primary)]">
                {meta.label}
              </h3>
              <span className="meta shrink-0 truncate">{meta.shortLabel}</span>
              <span className="meta ml-auto shrink-0">
                {group.articles.length} {group.articles.length === 1 ? "story" : "stories"}
              </span>
            </div>

            {/* The section is already named above every tile in the group, so
                repeating it on each card would be noise. */}
            <ArticleGrid
              feature={feature}
              articles={rest}
              showCategory={false}
              startIndex={group.start}
            />
          </section>
        );
      })}
    </div>
  );
}
