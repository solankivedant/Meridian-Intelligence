/**
 * Placeholders shaped like the thing that is coming.
 *
 * A spinner tells the reader that something is happening; a skeleton tells
 * them what — and because it occupies the same geometry as the real content,
 * the page does not jump when the content lands. The shapes here deliberately
 * mirror the feed's own measurements: a three-column grid of bordered cells
 * with a left accent edge, headline lines, then a byline.
 */

export function Bar({ width = "100%", height = 12 }: { width?: string; height?: number }) {
  return (
    <span
      className="block"
      style={{ width, height, backgroundColor: "var(--ink-wash)" }}
      aria-hidden
    />
  );
}

/** Two or three lines of prose. */
export function TextSkeleton({ lines = 3 }: { lines?: number }) {
  const widths = ["100%", "94%", "68%", "88%", "52%"];
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        <Bar key={i} width={widths[i % widths.length]} height={14} />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div
      className="flex flex-col gap-2.5 border p-4 pl-[13px]"
      style={{
        borderColor: "var(--rule)",
        borderLeftWidth: "3px",
        borderLeftColor: "var(--rule-strong)",
        backgroundColor: "var(--surface-1)",
      }}
      aria-hidden
    >
      <Bar width="38%" height={10} />
      <Bar height={16} />
      <Bar width="82%" height={16} />
      <div className="pt-2">
        <Bar width="46%" height={10} />
      </div>
    </div>
  );
}

/** The feed itself: a day header, then a grid of tiles. */
export function FeedSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="animate-pulse" role="status" aria-label="Loading stories">
      <div className="mb-3 flex items-baseline gap-3 border-b pb-2" style={{ borderColor: "var(--rule-strong)" }}>
        <Bar width="9rem" height={18} />
        <Bar width="5rem" height={10} />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: cards }, (_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <span className="sr-only">Loading stories…</span>
    </div>
  );
}
