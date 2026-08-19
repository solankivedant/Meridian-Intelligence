import { ArticleGrid } from "./ArticleGrid";
import type { FeedArticle } from "./ArticleRow";
import { withLeadFirst } from "@/lib/leadStory";
import { dayKey, dayLabel, shortDate } from "@/lib/formatTime";

type DayGroup = {
  key: string;
  label: string;
  date: Date;
  articles: FeedArticle[];
  /** Number the first tile of this day carries. */
  start: number;
};

function groupByDay(articles: FeedArticle[], startIndex: number): DayGroup[] {
  const groups: DayGroup[] = [];
  let current: DayGroup | undefined;
  // Numbering runs across the whole feed rather than restarting each day, so
  // a tile's number is its position in the list the reader asked for.
  let cursor = startIndex;

  // The feed arrives sorted newest-first, so a single pass is enough - a new
  // group starts whenever the IST calendar day changes.
  for (const article of articles) {
    const key = dayKey(article.publishedAt);
    if (!current || current.key !== key) {
      current = {
        key,
        label: dayLabel(article.publishedAt),
        date: article.publishedAt,
        articles: [],
        start: cursor,
      };
      groups.push(current);
    }
    current.articles.push(article);
    cursor++;
  }

  return groups;
}

/**
 * The feed's rhythm comes from days: each day opens with a dateline and a
 * feature, then tiles the rest. Grouping by day is what gives a long archive
 * somewhere to breathe - the grid alone would run on without a landmark.
 */
export function DayFeed({
  articles,
  showCategory = true,
  startIndex = 1,
}: {
  articles: FeedArticle[];
  showCategory?: boolean;
  /** Number the first tile carries. Pages continue the count, e.g. 41 on p2. */
  startIndex?: number;
}) {
  const groups = groupByDay(articles, startIndex);

  return (
    <div className="flex flex-col gap-10">
      {groups.map((group) => {
        // The day's feature is its strongest story, not merely its latest -
        // same reasoning as the page lead (see lib/leadStory.ts).
        const { lead: feature, rest } = withLeadFirst(group.articles);
        if (!feature) return null;
        return (
          <section key={group.key}>
            {/* The dateline is the archive's only landmark, so it is set as a
                dateline and not as fine print: a reader scrolling a long feed
                should be able to find the day boundary without stopping. */}
            <div
              className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b pb-2"
              style={{ borderColor: "var(--rule-strong)" }}
            >
              <h3 className="headline shrink-0 text-[19px] leading-none text-[var(--text-primary)]">
                {group.label}
              </h3>
              <span className="meta shrink-0">{shortDate(group.date)}</span>
              <span className="meta ml-auto shrink-0">
                {group.articles.length} {group.articles.length === 1 ? "story" : "stories"}
              </span>
            </div>

            <ArticleGrid
              feature={feature}
              articles={rest}
              showCategory={showCategory}
              startIndex={group.start}
            />
          </section>
        );
      })}
    </div>
  );
}
