import { Section } from "./Section";
import { DayFeed } from "./DayFeed";
import { SectionFeed } from "./SectionFeed";
import { FilterPanel } from "./FilterPanel";
import { Pagination } from "./Pagination";
import { EmptyState } from "./EmptyState";
import { NewSinceBanner } from "./NewSinceBanner";
import type { FeedArticle } from "./ArticleRow";
import { Category } from "@/lib/enums";
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
  counts,
  showSections = true,
}: {
  basePath: string;
  parsed: ParsedFeedParams;
  articles: FeedArticle[];
  total: number;
  index?: string;
  accentVar?: string;
  showCategory?: boolean;
  /** Stories per section in this window, for the filter chips. */
  counts?: Map<Category, number>;
  showSections?: boolean;
}) {
  const narrowed = isNarrowed(parsed);
  // Grouping follows the sort: a feed ordered by section wants section
  // headings, and datelines over one-story days would only fragment it.
  const bySection = parsed.sort === "section";

  return (
    <Section
      id="archive"
      index={index}
      title={narrowed ? "Archive" : "Latest stories"}
      accentVar={accentVar}
      note={total > 0 ? `${total.toLocaleString("en-IN")} stories` : undefined}
      description={
        bySection
          ? "Filtered view of the archive, grouped by section."
          : narrowed
            ? `Filtered view of the archive, ${parsed.sort === "old" ? "oldest" : "newest"} first.`
            : "Everything published recently, grouped by day."
      }
    >
      <FilterPanel
        basePath={basePath}
        filters={parsed}
        resultCount={total}
        counts={counts}
        showSections={showSections}
      />

      {/* Only the ids and timestamps cross to the browser — the banner counts,
          it does not render stories. */}
      <NewSinceBanner
        stories={articles.map((article) => ({
          id: article.id,
          publishedAt: article.publishedAt.toISOString(),
        }))}
      />

      {articles.length === 0 ? (
        <EmptyState filtered={narrowed} />
      ) : (
        <>
          {bySection ? (
            <SectionFeed
              articles={articles}
              startIndex={(parsed.page - 1) * PAGE_SIZE + 1}
            />
          ) : (
            <DayFeed
              articles={articles}
              showCategory={showCategory}
              // Page 2 starts at 41, not at 1 — the number is the story's
              // position in the whole filtered list, not on the screen.
              startIndex={(parsed.page - 1) * PAGE_SIZE + 1}
            />
          )}
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
