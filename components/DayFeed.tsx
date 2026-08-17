import { ArticleRow, FeedArticle } from "./ArticleRow";
import { withLeadFirst } from "@/lib/leadStory";
import { dayKey, dayLabel, shortDate } from "@/lib/formatTime";

type DayGroup = { key: string; label: string; date: Date; articles: FeedArticle[] };

function groupByDay(articles: FeedArticle[]): DayGroup[] {
  const groups: DayGroup[] = [];
  let current: DayGroup | undefined;

  // The feed arrives sorted newest-first, so a single pass is enough — a new
  // group starts whenever the IST calendar day changes.
  for (const article of articles) {
    const key = dayKey(article.publishedAt);
    if (!current || current.key !== key) {
      current = {
        key,
        label: dayLabel(article.publishedAt),
        date: article.publishedAt,
        articles: [],
      };
      groups.push(current);
    }
    current.articles.push(article);
  }

  return groups;
}

/**
 * The feed's rhythm comes from days, not from a card grid: each day opens with
 * a dateline and a feature, then drops into scannable rows. That cadence is
 * what gives a long list somewhere to breathe.
 */
export function DayFeed({
  articles,
  showCategory = true,
}: {
  articles: FeedArticle[];
  showCategory?: boolean;
}) {
  const groups = groupByDay(articles);

  return (
    <div className="flex flex-col gap-10">
      {groups.map((group) => {
        // The day's feature is its strongest story, not merely its latest —
        // same reasoning as the page lead (see lib/leadStory.ts).
        const { lead: feature, rest } = withLeadFirst(group.articles);
        if (!feature) return null;
        return (
          <section key={group.key}>
            <div className="mb-4 flex items-baseline gap-3">
              <h3 className="kicker shrink-0 text-[var(--text-primary)]">{group.label}</h3>
              <span className="meta shrink-0">{shortDate(group.date)}</span>
              <span className="h-px flex-1" style={{ backgroundColor: "var(--rule)" }} aria-hidden />
              <span className="meta shrink-0">
                {group.articles.length} {group.articles.length === 1 ? "story" : "stories"}
              </span>
            </div>

            <ArticleRow article={feature} variant="feature" showCategory={showCategory} />

            {rest.length > 0 && (
              <div className="mt-4 border-t" style={{ borderColor: "var(--rule)" }}>
                {rest.map((article) => (
                  <div key={article.id} className="border-b" style={{ borderColor: "var(--rule)" }}>
                    <ArticleRow article={article} variant="row" showCategory={showCategory} />
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
