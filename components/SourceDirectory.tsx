"use client";

import { useMemo, useState } from "react";
import { Search, VolumeX, X } from "lucide-react";
import { unmuteAll, useMutedSources } from "@/lib/prefs";
import { Section } from "./Section";
import { SourceList, matchesQuery, type SourceEntry } from "./SourceList";

type Desk = {
  id: string;
  title: string;
  unit: string;
  description: string;
  rows: SourceEntry[];
  initial: number;
  step: number;
  linkOut: boolean;
};

/**
 * The three source lists, under one search field.
 *
 * Provenance is answered by a single question - "is this outlet in here, and
 * how much of the dashboard is it?" - but the answer used to live in whichever
 * of three lists happened to hold it, and only the longest of them could be
 * searched. One field over all three means the reader types a name once and
 * finds it wherever it sits; a desk with nothing matching folds away rather
 * than standing there as an empty panel.
 *
 * The lists themselves are still separate sections, because how a source got
 * here - configured by hand, or picked up by the archive crawl - is part of
 * what the page is disclosing.
 */
export function SourceDirectory({
  india,
  world,
  discovered,
  startIndex = 1,
}: {
  india: SourceEntry[];
  world: SourceEntry[];
  discovered: SourceEntry[];
  /** Number of the first section, so the page can keep counting after these. */
  startIndex?: number;
}) {
  const [query, setQuery] = useState("");
  const muted = useMutedSources();

  const desks = useMemo<Desk[]>(
    () =>
      [
        {
          id: "india-feeds",
          title: "India desk feeds",
          unit: "feeds",
          description:
            "Ministries, regulators and Indian newsrooms, polled on every ingest run. The dot is the feed's default section; the figure is how many of its stories are held.",
          rows: india,
          initial: 18,
          step: 30,
          linkOut: true,
        },
        {
          id: "world-feeds",
          title: "World desk feeds",
          unit: "feeds",
          description: "Global business, trade, technology and geopolitics wires.",
          rows: world,
          initial: 18,
          step: 30,
          linkOut: true,
        },
        {
          id: "archive-publishers",
          title: "Publishers via the news archive",
          unit: "outlets",
          description:
            "The historical crawl queries a dated news archive rather than a fixed feed list, so these outlets appear because they published something matching one of the dashboard's topics - not because they were configured here. Ordered by how much they contributed.",
          rows: discovered,
          initial: 24,
          step: 100,
          linkOut: false,
        },
      ].filter((desk) => desk.rows.length > 0),
    [india, world, discovered]
  );

  const needle = query.trim();
  const searching = needle.length > 0;

  // Counted here rather than inside each list so the field can report a total
  // before any section has been drawn - including the case where the total is
  // zero and no section is drawn at all.
  const matches = useMemo(
    () => desks.map((desk) => desk.rows.filter((row) => matchesQuery(row.name, needle)).length),
    [desks, needle]
  );
  const total = desks.reduce((sum, desk) => sum + desk.rows.length, 0);
  const matched = matches.reduce((sum, n) => sum + n, 0);

  return (
    <>
      {/* The mute list is invisible everywhere else - a story from a muted
          publisher is dimmed, not labelled - so this page, which is where
          muting happens, is where it has to be accountable. */}
      {muted.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-1 border-l-2 py-1.5 pl-3"
          style={{ borderColor: "var(--cat-geopolitics)" }}
        >
          <VolumeX
            className="h-3.5 w-3.5 shrink-0"
            style={{ color: "var(--cat-geopolitics)" }}
            aria-hidden
          />
          <span className="text-[13px] text-[var(--text-secondary)]">
            {muted.length} {muted.length === 1 ? "publisher is" : "publishers are"} muted -
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

      <div
        className="flex items-center gap-2.5 border px-3 py-2.5 transition-colors focus-within:border-[var(--text-primary)]"
        style={{ borderColor: "var(--rule-strong)", backgroundColor: "var(--surface-1)" }}
      >
        <Search className="h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setQuery("");
          }}
          placeholder={`Find a source among ${total.toLocaleString("en-IN")} - feeds and archive publishers alike`}
          aria-label="Filter sources by name"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
        />
        {searching && (
          <>
            <span className="meta shrink-0 text-[10px]">
              {matched.toLocaleString("en-IN")} of {total.toLocaleString("en-IN")}
            </span>
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear the filter"
              className="shrink-0 border-l pl-2.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
              style={{ borderColor: "var(--rule)" }}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </>
        )}
      </div>

      {searching && matched === 0 && (
        <p className="text-[14px] text-[var(--text-muted)]">
          No source on record matches <strong>{needle}</strong>. Only publisher names are
          matched here - to search headlines, use the field in the masthead.
        </p>
      )}

      {desks.map((desk, i) => {
        // Section numbers are fixed by the page, not by what the filter left
        // standing, so a number never means two different lists.
        const index = String(startIndex + i).padStart(2, "0");
        if (searching && matches[i] === 0) return null;

        return (
          <Section
            key={desk.id}
            id={desk.id}
            index={index}
            title={desk.title}
            note={
              searching
                ? `${matches[i].toLocaleString("en-IN")} of ${desk.rows.length.toLocaleString("en-IN")} ${desk.unit}`
                : `${desk.rows.length.toLocaleString("en-IN")} ${desk.unit}`
            }
            description={desk.description}
          >
            <SourceList
              rows={desk.rows}
              query={needle}
              initial={desk.initial}
              step={desk.step}
              linkOut={desk.linkOut}
              muted={muted}
            />
          </Section>
        );
      })}
    </>
  );
}
