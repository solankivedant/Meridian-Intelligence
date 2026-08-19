import { RefreshCw } from "lucide-react";
import { isOlderThan, timeAgo, timestamp } from "@/lib/formatTime";

/**
 * How long since the last fetch before the tag starts saying so.
 *
 * Ingestion runs three times a day, roughly six to eight hours apart, so
 * fourteen hours means at least one run has been missed - the failure mode this
 * archive actually has. Under that, the tag is simply a fact; over it, it is a
 * warning, and it says which by colour rather than by extra words.
 */
const STALE_AFTER_HOURS = 14;

/**
 * When the archive was last fed, stated exactly, at the top of the page.
 *
 * The coverage strip already carries this, but as a relative age ("1d ago")
 * among four other figures, which is precisely the wrong shape for the question
 * readers actually ask - *is what I am looking at current?* A relative age needs
 * arithmetic before it answers that, and the strip's other numbers (archive
 * size, source count) are stable facts that give the fresh one nowhere to
 * stand out. Here it is a stamp, first thing on the page, with the relative age
 * kept alongside because "yesterday 09:36" and "28h ago" answer slightly
 * different halves of the question.
 */
export function LastUpdated({ at }: { at: number | null }) {
  if (!at) return null;

  const date = new Date(at);
  const stale = isOlderThan(date, STALE_AFTER_HOURS);
  const accent = stale ? "var(--cat-subsidy)" : "var(--cat-economy)";

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span
        className="kicker inline-flex shrink-0 items-center gap-1.5 border px-2 py-1 text-[9px]"
        style={{
          borderColor: accent,
          color: accent,
          backgroundColor: `color-mix(in srgb, ${accent} 9%, var(--surface-1))`,
        }}
      >
        <RefreshCw className="h-3 w-3" aria-hidden />
        Last updated
      </span>
      <time
        className="meta text-[11.5px] text-[var(--text-secondary)]"
        dateTime={date.toISOString()}
      >
        {timestamp(date)}
      </time>
      <span className="meta" aria-hidden>
        ·
      </span>
      <span className="meta" style={stale ? { color: accent } : undefined}>
        {timeAgo(date)}
      </span>
    </p>
  );
}
