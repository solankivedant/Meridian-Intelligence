import { Category } from "@/lib/enums";
import { CategoryBadge } from "./CategoryBadge";
import { StoryActions, StoryRef } from "./StoryActions";
import { StoryLink } from "./StoryLink";
import { NewBadge } from "./NewBadge";
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
 * Four registers for the same record:
 *
 *  - `lead`    the one story a page opens on - display headline, full deck
 *  - `feature` the first story of a day - a step down, still with a deck
 *  - `card`    a tile in the feed grid - headline, two lines of deck, byline
 *  - `row`     a single hairline-separated line, for narrow columns
 *
 * Mixing registers is the point. A page of identical tiles has no reading
 * order; a page with one lead, a feature per day, and cards between them tells
 * you where to start and where you may skim.
 */
export type ArticleVariant = "lead" | "feature" | "card" | "row";

export function ArticleRow({
  article,
  variant = "row",
  showCategory = true,
  index,
  note,
}: {
  article: FeedArticle;
  variant?: ArticleVariant;
  showCategory?: boolean;
  /** Position in the list this story is being shown in, 1-based. */
  index?: number;
  /** Editorial line on why this story is here - the topic desk sets it. */
  note?: string;
}) {
  const meta = metaForCategory(article.category);
  const accent = `var(${meta.colorVar})`;
  // Null whenever the feed's description just echoes the headline.
  const excerpt = deck(article.title, article.excerpt);
  // Everything the client-side controls need, flattened: they run in the
  // browser, where a Date is just a string that has to be parsed again.
  const story = storyRef(article);

  if (variant === "lead") {
    return (
      // Column-flex with the tags pushed to the bottom: the lead sits beside a
      // rail whose length it cannot know, and whichever of the two is shorter
      // has to fill its column or the panel ends up half empty.
      <article className="group relative flex h-full flex-col">
        <div className="flex items-center gap-2">
          {showCategory && <CategoryBadge meta={meta} href={`/category/${meta.slug}`} />}
          <NewBadge id={story.id} publishedAt={story.publishedAt} />
        </div>
        <StoryLink {...story} className="mt-2.5 block">
          <h3 className="headline text-[28px] leading-[1.12] text-[var(--text-primary)] sm:text-[38px]">
            <span className="link-underline">{article.title}</span>
          </h3>
          {/* Clamped even at display size: some feeds ship an entire
              statistical table as the description. */}
          {excerpt && (
            <p className="story-deck measure mt-3 line-clamp-4 text-[15px] leading-[1.65] text-[var(--text-secondary)]">
              {excerpt}
            </p>
          )}
        </StoryLink>
        {/* Byline and tags travel together as the story's footer, pushed to
            the base of the column so the lead and the rail beside it end on
            the same line whichever of the two runs shorter. */}
        <div className="mt-auto pt-5">
          <Byline article={article} />
          <TagList tags={article.tags} className="mt-3" />
        </div>
      </article>
    );
  }

  if (variant === "feature") {
    return (
      <article className="group relative">
        <Slugline index={index} accent={accent} story={story}>
          {showCategory && <CategoryBadge meta={meta} href={`/category/${meta.slug}`} size="xs" />}
        </Slugline>
        <StoryLink {...story} className="mt-2 block">
          <h3 className="headline-tight line-clamp-3 text-[20px] text-[var(--text-primary)] sm:text-[23px]">
            <span className="link-underline">{article.title}</span>
          </h3>
          {excerpt && (
            <p className="story-deck measure mt-2 line-clamp-2 text-[14px] leading-[1.6] text-[var(--text-secondary)]">
              {excerpt}
            </p>
          )}
        </StoryLink>
        <EditorNote note={note} accent={accent} />
        <Byline article={article} className="mt-2.5" />
      </article>
    );
  }

  if (variant === "card") {
    return (
      // `flex-1` + `mt-auto` on the byline: cards in a grid row are stretched
      // to a common height, and bylines that float mid-cell are what makes a
      // tiled feed look ragged.
      <article className="group relative flex flex-1 flex-col">
        <Slugline index={index} accent={accent} story={story}>
          {showCategory && <CategoryBadge meta={meta} href={`/category/${meta.slug}`} size="xs" />}
        </Slugline>
        <StoryLink
          {...story}
          className={showCategory || index !== undefined ? "mt-2 block" : "block"}
        >
          {/* Regulators file headlines that run to nine lines; unclamped, one
              of them sets the height of every tile in its row. */}
          <h3 className="headline-tight line-clamp-4 text-[16px] text-[var(--text-primary)] sm:text-[17px]">
            <span className="link-underline">{article.title}</span>
          </h3>
          {excerpt && (
            <p className="story-deck mt-1.5 line-clamp-2 text-[13px] leading-[1.55] text-[var(--text-secondary)]">
              {excerpt}
            </p>
          )}
        </StoryLink>
        <EditorNote note={note} accent={accent} />
        <Byline article={article} className="mt-auto pt-3" revealActions />
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
          <StoryLink {...story}>
            <h3 className="headline-tight text-[16px] text-[var(--text-primary)] sm:text-[17px]">
              <span className="link-underline">{article.title}</span>
            </h3>
          </StoryLink>
          <Byline
            article={article}
            className="mt-1.5"
            showCategory={showCategory}
            // The day header already establishes the date, so a row only
            // needs a clock - shown in the right margin where the eye can
            // read the column, and folded into the byline on narrow screens.
            timeDisplay="narrow-only"
            revealActions
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

/**
 * The line above a headline: its number in the list, then the category.
 *
 * The numeral is the point. A grid of tiles has no inherent reading order, and
 * "the third one" is not something a reader can say about a mosaic - a printed
 * rank gives every story a handle, and on the topic desk it *is* the ranking.
 * It carries the category colour so one glance reads as both.
 */
function Slugline({
  index,
  accent,
  story,
  children,
}: {
  index?: number;
  accent: string;
  story: StoryRef;
  children?: React.ReactNode;
}) {
  if (index === undefined && !children) return null;

  return (
    <div className="flex items-center gap-2">
      {index !== undefined && (
        <span
          className="meta inline-flex h-[18px] min-w-[22px] items-center justify-center px-1 text-[11px] font-semibold leading-none"
          style={{
            color: accent,
            backgroundColor: `color-mix(in srgb, ${accent} 13%, transparent)`,
          }}
          aria-hidden
        >
          {String(index).padStart(2, "0")}
        </span>
      )}
      {children}
      <NewBadge id={story.id} publishedAt={story.publishedAt} />
    </div>
  );
}

/** The desk editor's one-line reason, set apart from the source's own deck. */
function EditorNote({ note, accent }: { note?: string; accent: string }) {
  if (!note) return null;

  return (
    <p
      className="mt-2.5 border-l-2 pl-2.5 text-[12.5px] leading-[1.5] text-[var(--text-secondary)]"
      style={{ borderColor: accent }}
    >
      {note}
    </p>
  );
}

function Byline({
  article,
  className = "",
  showCategory = false,
  timeDisplay = "always",
  revealActions = false,
}: {
  article: FeedArticle;
  className?: string;
  showCategory?: boolean;
  timeDisplay?: "always" | "narrow-only";
  /** Keep the action cluster out of the way until the row is hovered. */
  revealActions?: boolean;
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
      <span className="ml-auto">
        {/* Whether the cluster hides until hover is decided inside it: a story
            already on the reading list has to keep showing that it is. */}
        <StoryActions story={storyRef(article)} reveal={revealActions} />
      </span>
    </div>
  );
}

/** The story as the client-side controls see it - plain, serialisable fields. */
function storyRef(article: FeedArticle): StoryRef {
  return {
    id: article.id,
    title: article.title,
    url: article.url,
    sourceName: article.source.name,
    category: article.category,
    publishedAt: article.publishedAt.toISOString(),
  };
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
