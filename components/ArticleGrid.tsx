import { ArticleRow, FeedArticle } from "./ArticleRow";
import { StoryCell } from "./StoryCell";
import { metaForCategory } from "@/lib/categoryMeta";

/**
 * The feed as a tiled grid rather than one long column.
 *
 * A single column of headlines on a 1100px page leaves most of the line empty
 * on the right - the eye travels a long way for very little, and the page
 * scrolls far further than it needs to. Tiling to two and three columns fills
 * the measure, and giving every tile its own ruled box keeps the boundary
 * between stories obvious once they no longer sit one-per-line.
 *
 * A `feature` opens each group at double width, so the group still leads with
 * its strongest story instead of flattening into a uniform mosaic - two of the
 * three columns at full size, with an ordinary tile filling the third.
 *
 * Two things make a tile identifiable at a glance without reading it: the
 * number in its slugline, and the category colour on its left edge. Both are
 * on the cell rather than inside the text, so they line up down the column.
 */
export function ArticleGrid({
  articles,
  feature,
  showCategory = true,
  startIndex,
  annotations,
}: {
  articles: FeedArticle[];
  feature?: FeedArticle;
  showCategory?: boolean;
  /** First number in the grid, 1-based. Omit to leave the tiles unnumbered. */
  startIndex?: number;
  /** Per-article editorial note, keyed by article id. */
  annotations?: Record<string, string>;
}) {
  // The feature is displayed first, so it takes the first number.
  const numberOf = (offset: number) =>
    startIndex === undefined ? undefined : startIndex + offset;

  return (
    <div className="story-grid grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {feature && (
        <Cell className="md:col-span-2" article={feature} tinted>
          <ArticleRow
            article={feature}
            variant="feature"
            showCategory={showCategory}
            index={numberOf(0)}
            note={annotations?.[feature.id]}
          />
        </Cell>
      )}
      {articles.map((article, i) => (
        <Cell key={article.id} article={article}>
          <ArticleRow
            article={article}
            variant="card"
            showCategory={showCategory}
            index={numberOf(feature ? i + 1 : i)}
            note={annotations?.[article.id]}
          />
        </Cell>
      ))}
    </div>
  );
}

/**
 * Flattens the record for `StoryCell`, which runs in the browser and marks the
 * cell up according to what this reader has read, saved and muted.
 */
function Cell({
  article,
  children,
  className = "",
  tinted = false,
}: {
  article: FeedArticle;
  children: React.ReactNode;
  className?: string;
  tinted?: boolean;
}) {
  return (
    <StoryCell
      id={article.id}
      accent={`var(${metaForCategory(article.category).colorVar})`}
      sourceName={article.source.name}
      publishedAt={article.publishedAt.toISOString()}
      tinted={tinted}
      className={className}
    >
      {children}
    </StoryCell>
  );
}
