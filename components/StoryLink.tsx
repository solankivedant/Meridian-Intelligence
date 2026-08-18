"use client";

import { markRead, useIsRead } from "@/lib/reading";
import type { StoryRef } from "./StoryActions";

/**
 * Every link out to a publisher goes through here.
 *
 * Three jobs, all of which have to live on the anchor itself rather than
 * around it: recording that the story was opened (a click, or a middle-click
 * into a background tab, which is how a feed is really read), dimming a story
 * already read, and carrying the story as `data-story-*` attributes so the
 * keyboard layer can walk the page and act on whichever headline is focused
 * without a shared store or a context.
 *
 * Because all four card registers already wrap their headline in one anchor,
 * routing them through this component gives read state and j/k navigation to
 * the whole site without restructuring a single server component.
 */
export function StoryLink({
  id,
  title,
  url,
  sourceName,
  category,
  publishedAt,
  className = "",
  children,
}: StoryRef & {
  className?: string;
  children: React.ReactNode;
}) {
  const read = useIsRead(id);
  const open = () => markRead(id);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={open}
      // Middle-click and cmd-click never fire onClick in every browser, but
      // both fire auxclick — without this, "open in a background tab" would
      // never mark anything read.
      onAuxClick={open}
      data-story-id={id}
      data-story-url={url}
      data-story-title={title}
      data-story-source={sourceName}
      data-story-category={category}
      data-story-published={publishedAt}
      data-read={read ? "true" : undefined}
      title={read ? "You have opened this story" : undefined}
      className={`story-link ${className}`}
    >
      {children}
    </a>
  );
}
