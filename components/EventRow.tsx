import type { ReactNode } from "react";
import Link from "next/link";
import { Category } from "@/lib/enums";
import { StoryLink } from "./StoryLink";
import { shortDate, timeAgo } from "@/lib/formatTime";

/**
 * One classified story, on a desk that has already decided what it is.
 *
 * The feed's `ArticleRow` is the wrong shape for the issuance and regulator
 * desks. Those pages are not reading order, they are a **ledger**: the reader
 * scans a column of kinds and audiences looking for the one line that concerns
 * them, and a deck under every headline is noise in that job. So this row
 * leads with its classification, sets the headline at one size, and puts the
 * publisher and date where they can be ignored.
 *
 * It still routes the headline through `StoryLink`, so read state and the
 * keyboard layer work here exactly as they do in the feed - a desk whose links
 * behaved differently from the rest of the site would be its own small bug.
 */
export function EventRow({
  id,
  title,
  url,
  sourceName,
  publishedAt,
  category,
  badge,
  tags,
  trailing,
}: {
  id: string;
  title: string;
  url: string;
  sourceName: string;
  publishedAt: Date;
  category: Category;
  /** The primary classification - what kind of thing this is. */
  badge: ReactNode;
  /** Secondary chips: who it binds, which companies it names. */
  tags?: ReactNode;
  /** Right-hand figure, e.g. the sum raised. */
  trailing?: ReactNode;
}) {
  return (
    <li
      className="group flex flex-col gap-2 border-b py-3.5 sm:flex-row sm:items-start sm:gap-4"
      style={{ borderColor: "var(--rule)" }}
    >
      <div className="flex shrink-0 items-center gap-2 sm:w-[10.5rem] sm:flex-col sm:items-start sm:gap-1">
        {badge}
        <span className="meta text-[10px]" title={shortDate(publishedAt)}>
          {timeAgo(publishedAt)}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <StoryLink
          id={id}
          title={title}
          url={url}
          sourceName={sourceName}
          category={category}
          publishedAt={publishedAt.toISOString()}
          className="headline-tight block text-[16px] text-[var(--text-primary)] underline-offset-4 group-hover:underline"
        >
          {title}
        </StoryLink>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="meta text-[10px]">{sourceName}</span>
          {tags}
        </div>
      </div>

      {trailing && (
        <div className="shrink-0 sm:pt-0.5 sm:text-right">{trailing}</div>
      )}
    </li>
  );
}

/** The coloured classification chip an event row leads with. */
export function KindBadge({
  label,
  colorVar,
  title,
}: {
  label: string;
  colorVar: string;
  title?: string;
}) {
  return (
    <span
      className="kicker inline-flex shrink-0 items-center px-2 py-[3px] text-[9px]"
      title={title}
      style={{
        color: `var(${colorVar})`,
        backgroundColor: `color-mix(in srgb, var(${colorVar}) 13%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, var(${colorVar}) 35%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}

/** A quiet secondary chip - an audience, a stage, a named company. */
export function MetaChip({
  children,
  href,
  title,
}: {
  children: ReactNode;
  href?: string;
  title?: string;
}) {
  const className =
    "inline-flex items-center border px-1.5 py-[1px] text-[11px] text-[var(--text-secondary)] transition-colors";
  const style = { borderColor: "var(--rule-strong)" };

  if (href) {
    return (
      <Link href={href} title={title} className={`${className} hover:bg-[var(--ink-wash)]`} style={style}>
        {children}
      </Link>
    );
  }
  return (
    <span title={title} className={className} style={style}>
      {children}
    </span>
  );
}
