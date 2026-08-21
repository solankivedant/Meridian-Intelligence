"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { metaForSector } from "@/lib/sectorMeta";
import { InstrumentPanel } from "./InstrumentPanel";
import { SectorDashboardButton } from "./SectorLink";
import type { SectorBridge } from "@/lib/instruments";

export type MarketSectorRow = {
  sector: string;
  label: string;
  bridge?: SectorBridge;
  /**
   * Passed in rather than looked up here on purpose: this is a client
   * component, and importing `lib/entities.ts` to call `companiesInSector`
   * would ship the entire ~300-name dictionary to the browser to render a
   * handful of chips per row.
   */
  companies: { key: string; name: string }[];
};

/**
 * The sector-to-instrument bridge, as a list you open rather than a table you
 * scroll.
 *
 * This began as a three-column table and had the failing that
 * `SectorAccordion` was written to solve on the sector board: the interesting
 * column is the one that does not fit. Each row carries a list of index names,
 * several of which need a note explaining what the index actually holds
 * ("NIFTY Energy is majority oil, gas and thermal - not a renewables proxy"),
 * plus a paragraph on how the theme is reachable in practice, plus the gap
 * notice where nothing tracks it at all. None of that fits in a table cell, so
 * in the table version it was either truncated into a `title` attribute - which
 * is invisible on a phone and undiscoverable on a laptop - or dropped.
 *
 * Unlike the sector board, this list expands at **every** width rather than
 * only below `lg`. The board can justify a desktop table because its columns
 * are all short figures that genuinely compare; these rows are prose, and a
 * wide screen does not make prose in a cell any more readable. What the extra
 * width buys instead is the summary in the closed row: from `sm` up, the header
 * shows the first couple of index names, so the list still scans like the table
 * did without hiding what the table had to leave out.
 *
 * One row is open at a time. Twenty-six rows all expanded is a page nobody can
 * navigate, and opening a second closing the first keeps the list the length it
 * looked like when you arrived.
 */
export function MarketSectorList({ rows }: { rows: MarketSectorRow[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <ul className="flex flex-col border-t" style={{ borderColor: "var(--rule-strong)" }}>
      {rows.map(({ sector, label, bridge, companies }) => {
        const meta = metaForSector(sector);
        const Icon = meta.icon;
        const accent = `var(${meta.colorVar})`;
        const open = openKey === sector;
        const indices = bridge?.indices ?? [];
        const tracked = indices.length > 0;

        return (
          <li key={sector} className="border-b" style={{ borderColor: "var(--rule)" }}>
            <button
              type="button"
              aria-expanded={open}
              // Toggling to null rather than to this key is what makes a second
              // click on the open row close it again.
              onClick={() => setOpenKey(open ? null : sector)}
              className="flex w-full items-center gap-3 px-1 py-3 text-left transition-colors hover:bg-[var(--ink-wash)]"
              style={{
                boxShadow: open ? `inset 3px 0 0 0 ${accent}` : undefined,
                backgroundColor: open ? "var(--ink-wash)" : undefined,
              }}
            >
              <span
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center"
                style={{
                  color: accent,
                  backgroundColor: `color-mix(in srgb, ${accent} 13%, transparent)`,
                }}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </span>

              <span className="min-w-0 flex-1 text-[14px] font-medium text-[var(--text-primary)]">
                {label}
              </span>

              {/* The scannable half of the old table, kept where there is room
                  for it. Below `sm` the row falls back to the count chip on the
                  right, which is the same fact at a width that fits. */}
              <span className="hidden min-w-0 flex-1 justify-end gap-x-2 sm:flex">
                {tracked ? (
                  <>
                    <span className="truncate text-[12.5px] text-[var(--text-secondary)]">
                      {indices[0].name}
                    </span>
                    {indices.length > 1 && (
                      <span className="meta shrink-0 text-[10px]">+{indices.length - 1}</span>
                    )}
                  </>
                ) : (
                  <span className="kicker shrink-0 text-[9px]" style={{ color: "var(--cat-geopolitics)" }}>
                    No index
                  </span>
                )}
              </span>

              <span
                className="meta shrink-0 text-[11px] sm:hidden"
                style={{ color: tracked ? undefined : "var(--cat-geopolitics)" }}
              >
                {tracked ? `${indices.length} idx` : "none"}
              </span>

              <ChevronDown
                className={`h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform ${
                  open ? "rotate-180" : ""
                }`}
                aria-hidden
              />
            </button>

            {open && (
              <div className="flex flex-col gap-5 px-1 pt-1 pb-5 sm:pl-11">
                <InstrumentPanel bridge={bridge} />

                {companies.length > 0 && (
                  <div>
                    <p className="kicker mb-2 text-[9px] text-[var(--text-muted)]">
                      Companies the archive tracks here
                    </p>
                    <ul className="flex flex-wrap gap-x-2 gap-y-1.5">
                      {companies.map((company) => (
                        <li key={company.key}>
                          <Link
                            href={`/company/${company.key}`}
                            className="inline-block border px-2 py-[2px] text-[12px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--ink-wash)] hover:text-[var(--text-primary)]"
                            style={{ borderColor: "var(--rule-strong)" }}
                          >
                            {company.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* The way through to the measured half of the story. Kept at
                    the bottom because the panel above is what the reader opened
                    the row for; this is where they go next, not instead. */}
                <SectorDashboardButton
                  href={`/opportunities/${sector}`}
                  label={label}
                  accent={accent}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
