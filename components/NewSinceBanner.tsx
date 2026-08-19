"use client";

import { Check, Sparkle } from "lucide-react";
import { markManyRead, useReadLog, useVisitBoundary } from "@/lib/reading";
import { clockTime, timeAgo } from "@/lib/formatTime";

/**
 * "What's landed since I last looked" - the question a returning reader
 * actually arrives with.
 *
 * The count is computed in the browser from the timestamps already on the
 * page, so it costs no query and stays correct on a filtered or paged view: it
 * always describes the list being looked at rather than the archive as a
 * whole. It renders nothing before hydration, on a first-ever visit, and once
 * the reader has caught up - a banner that is always there says nothing.
 */
export function NewSinceBanner({
  stories,
}: {
  /** Every story in the list below, newest first. ISO timestamps. */
  stories: { id: string; publishedAt: string }[];
}) {
  const boundary = useVisitBoundary();
  const read = useReadLog();

  if (boundary === null) return null;

  const fresh = stories.filter(
    (story) => Date.parse(story.publishedAt) > boundary && read[story.id] === undefined
  );
  if (fresh.length === 0) return null;

  const since = new Date(boundary);

  return (
    <div
      data-noprint
      className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-l-2 py-2 pl-3"
      style={{
        borderColor: "var(--cat-geopolitics)",
        backgroundColor: "color-mix(in srgb, var(--cat-geopolitics) 6%, transparent)",
      }}
    >
      <Sparkle
        className="h-3.5 w-3.5 shrink-0"
        style={{ color: "var(--cat-geopolitics)" }}
        aria-hidden
      />
      <p className="text-[13px] text-[var(--text-primary)]" aria-live="polite">
        <strong className="font-semibold">
          {fresh.length} {fresh.length === 1 ? "story" : "stories"}
        </strong>{" "}
        <span className="text-[var(--text-secondary)]">
          on this page since your last visit - {timeAgo(since)}, {clockTime(since)} IST
        </span>
      </p>
      <button
        type="button"
        onClick={() => markManyRead(stories.map((story) => story.id))}
        className="kicker ml-auto inline-flex shrink-0 items-center gap-1 border px-2 py-1 text-[9px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--ink-wash)] hover:text-[var(--text-primary)]"
        style={{ borderColor: "var(--rule-strong)" }}
      >
        <Check className="h-3 w-3" aria-hidden />
        Mark page read
      </button>
    </div>
  );
}
