"use client";

import { useMemo, useState } from "react";
import { Search, VolumeX } from "lucide-react";
import { Category } from "@/lib/enums";
import { metaForCategory } from "@/lib/categoryMeta";
import { unmuteAll, useMutedSources } from "@/lib/prefs";
import { MuteToggle } from "./MuteToggle";

export type SourceEntry = {
  id: string;
  name: string;
  /** Omitted for archive-discovered publishers, which are not linked out. */
  url?: string;
  category: Category;
  count: number;
};

/**
 * A list of sources that does not run off the bottom of the page.
 *
 * The archive crawl has surfaced well over a thousand publishers, and printing
 * them all made provenance — the point of this page — something you had to
 * scroll past rather than read. The list opens at a readable height, reveals in
 * chunks, and (where it is long enough to need it) can be searched by name, so
 * "is my outlet in here?" is a question you answer by typing rather than by
 * scrolling.
 */
export function SourceList({
  rows,
  initial = 18,
  step = 60,
  linkOut = false,
  searchable = false,
}: {
  rows: SourceEntry[];
  /** How many rows are shown before the reader asks for more. */
  initial?: number;
  /** How many each "show more" adds. */
  step?: number;
  linkOut?: boolean;
  searchable?: boolean;
}) {
  // A list barely longer than the cap is worth showing whole: "View 1 more"
  // asks the reader to click for less than it costs to read the button.
  const opening = rows.length <= initial + 4 ? rows.length : initial;
  const [limit, setLimit] = useState(opening);
  const [query, setQuery] = useState("");
  const muted = useMutedSources();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => row.name.toLowerCase().includes(needle));
  }, [rows, query]);

  // A search that matches four outlets should show all four, not the first
  // page of them — the cap exists for the unfiltered list.
  const searching = query.trim().length > 0;
  const cap = searching ? Math.max(limit, 60) : limit;
  const visible = filtered.slice(0, cap);
  const remaining = filtered.length - visible.length;

  if (rows.length === 0) {
    return (
      <p className="text-[14px] text-[var(--text-muted)]">
        Nothing recorded yet — run an ingest to populate this list.
      </p>
    );
  }

  return (
    <div>
      {/* The mute list is invisible everywhere else — a story from a muted
          publisher is dimmed, not labelled — so this page, which is where
          muting happens, is where it has to be accountable. */}
      {muted.length > 0 && (
        <div
          className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-l-2 py-1.5 pl-3"
          style={{ borderColor: "var(--cat-geopolitics)" }}
        >
          <VolumeX
            className="h-3.5 w-3.5 shrink-0"
            style={{ color: "var(--cat-geopolitics)" }}
            aria-hidden
          />
          <span className="text-[13px] text-[var(--text-secondary)]">
            {muted.length} {muted.length === 1 ? "publisher is" : "publishers are"} muted —
            their stories are dimmed in the feed, never removed.
          </span>
          <button
            type="button"
            onClick={unmuteAll}
            className="kicker ml-auto text-[9px] text-[var(--text-secondary)] underline underline-offset-2 transition-colors hover:text-[var(--text-primary)]"
          >
            Unmute all
          </button>
        </div>
      )}

      {searchable && (
        <div
          className="mb-4 flex items-center gap-2 border-b pb-1.5"
          style={{ borderColor: "var(--rule-strong)" }}
        >
          <Search className="h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(opening);
            }}
            placeholder={`Find a publisher among ${rows.length.toLocaleString("en-IN")}`}
            aria-label="Filter sources by name"
            className="min-w-0 flex-1 bg-transparent py-1 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
          />
          {searching && (
            <span className="meta shrink-0">
              {filtered.length.toLocaleString("en-IN")} matching
            </span>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="py-4 text-[14px] text-[var(--text-muted)]">
          No publisher here matches <strong>{query.trim()}</strong>.
        </p>
      ) : (
        <ul
          className="grid border-t sm:grid-cols-2 sm:gap-x-8 xl:grid-cols-3"
          style={{ borderColor: "var(--rule)" }}
        >
          {visible.map((source) => (
            <SourceRow
              key={source.id}
              source={source}
              linkOut={linkOut}
              muted={muted.includes(source.name)}
            />
          ))}
        </ul>
      )}

      {(remaining > 0 || limit > opening) && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {remaining > 0 && (
            <button
              type="button"
              onClick={() => setLimit(cap + step)}
              className="kicker border px-3 py-1.5 text-[10px] text-[var(--text-primary)] transition-colors hover:bg-[var(--ink-wash)]"
              style={{ borderColor: "var(--rule-strong)" }}
            >
              View {Math.min(step, remaining).toLocaleString("en-IN")} more
            </button>
          )}
          {remaining > step && (
            <button
              type="button"
              onClick={() => setLimit(filtered.length)}
              className="text-[13px] text-[var(--text-secondary)] underline underline-offset-2 transition-colors hover:text-[var(--text-primary)]"
            >
              Show all {filtered.length.toLocaleString("en-IN")}
            </button>
          )}
          {limit > opening && (
            <button
              type="button"
              onClick={() => setLimit(opening)}
              className="text-[13px] text-[var(--text-secondary)] underline underline-offset-2 transition-colors hover:text-[var(--text-primary)]"
            >
              Collapse
            </button>
          )}
          <span className="meta ml-auto">
            showing {visible.length.toLocaleString("en-IN")} of{" "}
            {filtered.length.toLocaleString("en-IN")}
          </span>
        </div>
      )}
    </div>
  );
}

function SourceRow({
  source,
  linkOut,
  muted,
}: {
  source: SourceEntry;
  linkOut: boolean;
  muted: boolean;
}) {
  const meta = metaForCategory(source.category);

  return (
    <li
      className="group flex items-baseline gap-3 border-b py-2.5"
      style={{ borderColor: "var(--rule)", opacity: muted ? 0.55 : 1 }}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: `var(${meta.colorVar})` }}
        title={meta.label}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--text-primary)]">
        {linkOut && source.url ? (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:underline"
            title={source.url}
          >
            {source.name}
          </a>
        ) : (
          source.name
        )}
      </span>
      <MuteToggle sourceName={source.name} />
      <span className="meta shrink-0" title={`${source.count} stories`}>
        {source.count.toLocaleString("en-IN")}
      </span>
    </li>
  );
}
