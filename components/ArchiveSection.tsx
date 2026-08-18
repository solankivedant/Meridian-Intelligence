import { Section } from "./Section";
import { DayFeed } from "./DayFeed";
import { FilterPanel } from "./FilterPanel";
import { Pagination } from "./Pagination";
import { EmptyState } from "./EmptyState";
import type { FeedArticle } from "./ArticleRow";
import { PAGE_SIZE, ParsedFeedParams, feedLinkParams, isNarrowed } from "@/lib/feedQuery";

/**
 * The filter panel, the day-grouped feed and its pager are always used
 * together and were previously copy-pasted into every page. Keeping them in
 * one component is what makes "the archive looks the same everywhere" a
 * feature rather than four drifting variants.
 */
export function ArchiveSection({
  basePath,
  parsed,
  articles,
  total,
  index,
  accentVar,
  showCategory = true,
}: {
  basePath: string;
  parsed: ParsedFeedParams;
  articles: FeedArticle[];
  total: number;
  index?: string;
  accentVar?: string;
  showCategory?: boolean;
}) {
  const narrowed = isNarrowed(parsed);

  return (
    <Section
      id="archive"
      index={index}
      title={narrowed ? "Archive" : "Latest stories"}
      accentVar={accentVar}
      note={total > 0 ? `${total.toLocaleString("en-IN")} stories` : undefined}
      description={
        narrowed
          ? "Filtered view of the archive, newest first."
          : "Everything published recently, grouped by day."
      }
    >
      <FilterPanel basePath={basePath} filters={parsed} resultCount={total} />

      {articles.length === 0 ? (
        <EmptyState filtered={narrowed} />
      ) : (
        <>
          <DayFeed articles={articles} showCategory={showCategory} />
          <Pagination
            basePath={basePath}
            params={feedLinkParams(parsed)}
            page={parsed.page}
            pageSize={PAGE_SIZE}
            total={total}
          />
        </>
      )}
    </Section>
  );
}
