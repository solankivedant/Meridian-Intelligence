import { Section } from "./Section";
import { DayFeed } from "./DayFeed";
import { SectionFeed } from "./SectionFeed";
import { SectionBoard, type BoardSection } from "./SectionBoard";
import { SectionIcon } from "./MetaIcon";
import { StoryCell } from "./StoryCell";
import { FilterPanel } from "./FilterPanel";
import { Pagination } from "./Pagination";
import { EmptyState } from "./EmptyState";
import { NewSinceBanner } from "./NewSinceBanner";
import { ArticleRow, type FeedArticle } from "./ArticleRow";
import { Category } from "@/lib/enums";
import { metaForCategory } from "@/lib/categoryMeta";
import type { BoardGroup } from "@/lib/sectionBoard";
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
  board,
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
  /**
   * Per-section slices, fetched only when the reader asked to sort by section.
   * Supplied by pages that span every section; a section page has none.
   */
  board?: BoardGroup[];
}) {
  const narrowed = isNarrowed(parsed);
  // Grouping follows the sort: a feed ordered by section wants section
  // headings, and datelines over one-story days would only fragment it.
  const bySection = parsed.sort === "section";
  // The board replaces both the feed and the pager: each box carries its own.
  const boarded = bySection && board !== undefined && board.length > 0;

  return (
    <Section
      id="archive"
      index={index}
      title={narrowed ? "Archive" : "Latest stories"}
      accentVar={accentVar}
      note={total > 0 ? `${total.toLocaleString("en-IN")} stories` : undefined}
      description={
        boarded
          ? "Every section side by side, two rows each - page a box without leaving the others."
          : bySection
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

      {/* Only the ids and timestamps cross to the browser - the banner counts,
          it does not render stories. */}
      <NewSinceBanner
        stories={articles.map((article) => ({
          id: article.id,
          publishedAt: article.publishedAt.toISOString(),
        }))}
      />

      {boarded ? (
        <SectionBoard sections={board.map(boardSection)} />
      ) : articles.length === 0 ? (
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
              // Page 2 starts at 41, not at 1 - the number is the story's
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

/**
 * One section's box, with its tiles rendered here on the server.
 *
 * The board itself runs in the browser because paging is local, but the
 * stories are ordinary server-rendered tiles handed to it as nodes - which
 * keeps the feed's markup identical to the rest of the site and keeps the
 * category metadata (an icon component among it) off the wire.
 */
function boardSection(group: BoardGroup): BoardSection {
  const meta = metaForCategory(group.category);
  const accent = `var(${meta.colorVar})`;

  return {
    key: meta.slug,
    label: meta.label,
    color: accent,
    icon: <SectionIcon meta={meta} size="md" />,
    total: group.total,
    href: `/category/${meta.slug}`,
    tiles: group.articles.map((article, i) => (
      <StoryCell
        key={article.id}
        id={article.id}
        accent={accent}
        sourceName={article.source.name}
        publishedAt={article.publishedAt.toISOString()}
      >
        {/* The box header names the section above every tile in it, so
            repeating it on each card would only be noise. Numbering runs
            within the section, because that is the list being paged. */}
        <ArticleRow article={article} variant="card" showCategory={false} index={i + 1} />
      </StoryCell>
    )),
  };
}
