import { ArticleRow, FeedArticle } from "./ArticleRow";

/**
 * The feed as a tiled grid rather than one long column.
 *
 * A single column of headlines on a 1100px page leaves most of the line empty
 * on the right — the eye travels a long way for very little, and the page
 * scrolls far further than it needs to. Tiling to two and three columns fills
 * the measure, and giving every tile its own ruled box keeps the boundary
 * between stories obvious once they no longer sit one-per-line.
 *
 * A `feature` opens each group at double width, so the group still leads with
 * its strongest story instead of flattening into a uniform mosaic — two of the
 * three columns at full size, with an ordinary tile filling the third.
 */
export function ArticleGrid({
  articles,
  feature,
  showCategory = true,
}: {
  articles: FeedArticle[];
  feature?: FeedArticle;
  showCategory?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {feature && (
        <Cell className="md:col-span-2" tinted>
          <ArticleRow article={feature} variant="feature" showCategory={showCategory} />
        </Cell>
      )}
      {articles.map((article) => (
        <Cell key={article.id}>
          <ArticleRow article={article} variant="card" showCategory={showCategory} />
        </Cell>
      ))}
    </div>
  );
}

function Cell({
  children,
  className = "",
  tinted = false,
}: {
  children: React.ReactNode;
  className?: string;
  tinted?: boolean;
}) {
  return (
    <div
      // `flex` rather than `block` so the card inside can stretch to the full
      // height the grid row gives this cell.
      className={`flex border p-4 transition-colors hover:border-[var(--rule-strong)] ${className}`}
      style={{
        borderColor: "var(--rule)",
        backgroundColor: tinted ? "var(--surface-2)" : "var(--surface-1)",
      }}
    >
      {children}
    </div>
  );
}
