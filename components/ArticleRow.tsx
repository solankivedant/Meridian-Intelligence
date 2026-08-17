import { Category } from "@prisma/client";
import { CategoryBadge } from "./CategoryBadge";
import { AskArticleButton } from "./AskArticleButton";
import { metaForCategory } from "@/lib/categoryMeta";
import { tagLabel } from "@/lib/categorize";
import { clockTime, timeAgo } from "@/lib/formatTime";
import { deck } from "@/lib/deck";

export type FeedArticle = {
  id: string;
  title: string;
  excerpt: string;
  url: string;
  category: Category;
  tags: string[];
  publishedAt: Date;
  source: { name: string };
};

/**
 * Three registers for the same record:
 *
 *  - `lead`    the one story a page opens on — display headline, full deck
 *  - `feature` the first story of a day — a step down, still with a deck
 *  - `row`     everything else — one hairline-separated line to scan
 *
 * Mixing registers is the point. A page of identical cards has no reading
 * order; a page with one lead, a feature per day, and rows between them tells
 * you where to start and where you may skim.
 */
export type ArticleVariant = "lead" | "feature" | "row";

export function ArticleRow({
  article,
  variant = "row",
  showCategory = true,
}: {
  article: FeedArticle;
  variant?: ArticleVariant;
  showCategory?: boolean;
}) {
  const meta = metaForCategory(article.category);
  // Null whenever the feed's description just echoes the headline.
  const excerpt = deck(article.title, article.excerpt);

  if (variant === "lead") {
    return (
      <article className="group relative">
        {showCategory && <CategoryBadge meta={meta} href={`/category/${meta.slug}`} />}
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2.5 block"
        >
          <h3 className="headline text-[28px] leading-[1.12] text-[var(--text-primary)] sm:text-[38px]">
            <span className="link-underline">{article.title}</span>
          </h3>
          {/* Clamped even at display size: some feeds ship an entire
              statistical table as the description. */}
          {excerpt && (
            <p className="measure mt-3 line-clamp-4 text-[15px] leading-[1.65] text-[var(--text-secondary)]">
              {excerpt}
            </p>
          )}
        </a>
        <Byline article={article} className="mt-4" />
        <TagList tags={article.tags} className="mt-3" />
      </article>
    );
  }

  if (variant === "feature") {
    return (
      <article className="group relative">
        {showCategory && <CategoryBadge meta={meta} href={`/category/${meta.slug}`} size="xs" />}
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 block"
        >
          <h3 className="headline-tight text-[20px] text-[var(--text-primary)] sm:text-[23px]">
            <span className="link-underline">{article.title}</span>
          </h3>
          {excerpt && (
            <p className="measure mt-2 line-clamp-2 text-[14px] leading-[1.6] text-[var(--text-secondary)]">
              {excerpt}
            </p>
          )}
        </a>
        <Byline article={article} className="mt-2.5" />
      </article>
    );
  }

  return (
    <article className="group relative py-3.5">
      <div className="flex items-baseline gap-3 sm:gap-4">
        <span
          className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: `var(${meta.colorVar})` }}
          title={meta.label}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <a href={article.url} target="_blank" rel="noopener noreferrer">
            <h3 className="headline-tight text-[16px] text-[var(--text-primary)] sm:text-[17px]">
              <span className="link-underline">{article.title}</span>
            </h3>
          </a>
          <Byline
            article={article}
            className="mt-1.5"
            showCategory={showCategory}
            // The day header already establishes the date, so a row only
            // needs a clock — shown in the right margin where the eye can
            // read the column, and folded into the byline on narrow screens.
            timeDisplay="narrow-only"
            revealAsk
          />
        </div>
        <time
          className="meta hidden shrink-0 pt-1 sm:block"
          dateTime={article.publishedAt.toISOString()}
        >
          {clockTime(article.publishedAt)}
        </time>
      </div>
    </article>
  );
}

function Byline({
  article,
  className = "",
  showCategory = false,
  timeDisplay = "always",
  revealAsk = false,
}: {
  article: FeedArticle;
  className?: string;
  showCategory?: boolean;
  timeDisplay?: "always" | "narrow-only";
  /** Keep the Ask affordance out of the way until the row is hovered. */
  revealAsk?: boolean;
}) {
  const meta = metaForCategory(article.category);

  return (
    <div className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 ${className}`}>
      <span className="text-[12px] font-medium text-[var(--text-secondary)]">
        {article.source.name}
      </span>
      {showCategory && (
        <>
          <Dot />
          <span className="text-[11px]" style={{ color: `var(${meta.colorVar})` }}>
            {meta.shortLabel}
          </span>
        </>
      )}
      <Dot className={timeDisplay === "narrow-only" ? "sm:hidden" : undefined} />
      <time
        className={`meta ${timeDisplay === "narrow-only" ? "sm:hidden" : ""}`}
        dateTime={article.publishedAt.toISOString()}
      >
        {timeAgo(article.publishedAt)}
      </time>
      <span
        className={
          revealAsk
            ? "ml-auto transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
            : "ml-auto"
        }
      >
        <AskArticleButton articleId={article.id} title={article.title} />
      </span>
    </div>
  );
}

function Dot({ className = "" }: { className?: string }) {
  return (
    <span className={`text-[var(--text-muted)] ${className}`} aria-hidden>
      ·
    </span>
  );
}

function TagList({ tags, className = "" }: { tags: string[]; className?: string }) {
  if (tags.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-x-3 gap-y-1 ${className}`}>
      {tags.slice(0, 5).map((tag) => (
        <span key={tag} className="kicker text-[10px] text-[var(--text-muted)]">
          {tagLabel(tag)}
        </span>
      ))}
    </div>
  );
}
