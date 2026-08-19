"use client";

import { useIsNew, useIsRead } from "@/lib/reading";
import { useMutedSources } from "@/lib/prefs";

/**
 * The ruled box a tile sits in.
 *
 * It became a client component when three reader-side states needed to show on
 * the cell rather than inside it: a story that arrived since the last visit
 * gets a wash of its section colour, a story from a muted publisher recedes
 * until hovered, and both have to be decided in the browser. The tile itself -
 * headline, deck, byline - is still server-rendered and passed straight
 * through as children.
 */
export function StoryCell({
  id,
  accent,
  sourceName,
  publishedAt,
  tinted = false,
  className = "",
  children,
}: {
  id: string;
  /** Resolved CSS colour for the story's section, e.g. `var(--cat-policy)`. */
  accent: string;
  sourceName: string;
  /** ISO 8601. */
  publishedAt: string;
  tinted?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const muted = useMutedSources().includes(sourceName);
  const isNew = useIsNew(publishedAt);
  const read = useIsRead(id);
  const flagNew = isNew && !read;
  // A story that arrived since the last visit gets a firmer box, tinted
  // towards its own section colour.
  const edge = flagNew ? `color-mix(in srgb, ${accent} 45%, var(--rule))` : "var(--rule)";

  return (
    <div
      data-muted={muted ? "true" : undefined}
      className={`story-cell flex border p-4 pl-[13px] transition-colors hover:border-[var(--rule-strong)] ${className}`}
      title={muted ? `${sourceName} is muted - unmute it on the sources page` : undefined}
      style={{
        // Four longhands rather than `borderColor` plus an override: React
        // warns when a shorthand and a longhand for the same property are both
        // set on an element that re-renders, and this one re-renders whenever
        // the reader's state changes.
        borderTopColor: edge,
        borderRightColor: edge,
        borderBottomColor: edge,
        // The section colour rides the cell's own left edge: on a white plane
        // a hairline box alone gives the eye nothing to sort tiles by.
        borderLeftWidth: "3px",
        borderLeftColor: accent,
        backgroundColor: flagNew
          ? `color-mix(in srgb, ${accent} 6%, var(--surface-1))`
          : tinted
            ? "var(--surface-2)"
            : "var(--surface-1)",
      }}
    >
      {children}
    </div>
  );
}
