"use client";

import { useMemo, useState } from "react";
import { Category } from "@/lib/enums";
import { metaForCategory } from "@/lib/categoryMeta";
import { Highlight } from "./Highlight";
import { MuteToggle } from "./MuteToggle";

export type SourceEntry = {
  id: string;
  name: string;
  /** Omitted for archive-discovered publishers, which are not linked out. */
  url?: string;
  category: Category;
  count: number;
};

/** The one rule for what the source filter considers a hit, shared with the caller. */
export function matchesQuery(name: string, query: string): boolean {
  if (!query) return true;
  return name.toLowerCase().includes(query.toLowerCase());
}

/**
 * A list of sources that does not run off the bottom of the page.
 *
 * The archive crawl has surfaced well over a thousand publishers, and printing
 * them all made provenance - the point of this page - something you had to
 * scroll past rather than read. The list opens at a readable height and reveals
 * in chunks.
 *
 * Filtering is not its own: the query comes from the page's single search field
 * (`SourceDirectory`), so "is my outlet in here?" is answered across every list
 * at once rather than one section at a time.
 */
export function SourceList({
  rows,
  query = "",
  initial = 18,
  step = 60,
  linkOut = false,
  muted = [],
}: {
  rows: SourceEntry[];
  /** Name filter, already trimmed. Empty means show everything. */
  query?: string;
  /** How many rows are shown before the reader asks for more. */
  initial?: number;
  /** How many each "show more" adds. */
  step?: number;
  linkOut?: boolean;
  /** Names of muted publishers, read once by the page and passed down. */
  muted?: string[];
}) {
  // A list barely longer than the cap is worth showing whole: "View 1 more"
  // asks the reader to click for less than it costs to read the button.
  const opening = rows.length <= initial + 4 ? rows.length : initial;
  const [limit, setLimit] = useState(opening);

  // A new query is a new list, so whatever the reader had unfolded for the old
  // one should not carry over.
  const [lastQuery, setLastQuery] = useState(query);
  if (lastQuery !== query) {
    setLastQuery(query);
    setLimit(opening);
  }

  const filtered = useMemo(
    () => (query ? rows.filter((row) => matchesQuery(row.name, query)) : rows),
    [rows, query]
  );

  // A search that matches four outlets should show all four, not the first
  // page of them - the cap exists for the unfiltered list.
  const cap = query ? Math.max(limit, 60) : limit;
  const visible = filtered.slice(0, cap);
  const remaining = filtered.length - visible.length;

  if (rows.length === 0) {
    return (
      <p className="text-[14px] text-[var(--text-muted)]">
        Nothing recorded yet - run an ingest to populate this list.
      </p>
    );
  }

  return (
    <div>
      {filtered.length === 0 ? (
        <p className="py-1 text-[14px] text-[var(--text-muted)]">
          No source in this list matches <strong>{query}</strong>.
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
              query={query}
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
  query,
  linkOut,
  muted,
}: {
  source: SourceEntry;
  query: string;
  linkOut: boolean;
  muted: boolean;
}) {
  const meta = metaForCategory(source.category);
  // `anywhere`: the filter above is a substring match, so the mark has to be
  // able to land mid-word - "hindu" inside "BusinessLine - Hindu".
  const label = <Highlight text={source.name} terms={query ? [query] : undefined} match="anywhere" />;

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
            {label}
          </a>
        ) : (
          label
        )}
      </span>
      <MuteToggle sourceName={source.name} />
      <span className="meta shrink-0" title={`${source.count} stories`}>
        {source.count.toLocaleString("en-IN")}
      </span>
    </li>
  );
}
