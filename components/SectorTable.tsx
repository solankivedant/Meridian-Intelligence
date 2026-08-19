import Link from "next/link";
import type { SectorSignal } from "@/lib/opportunity";
import { opportunityScore } from "@/lib/opportunity";
import { Sparkline } from "./charts/Sparkline";
import { SectorAccordion } from "./SectorAccordion";
import { SectorLink } from "./SectorLink";
import { metaForSector } from "@/lib/sectorMeta";
import { FALLING_HUE, RISING_HUE, count, percent, percentChange } from "./charts/chartUtils";

export type SectorSort = "score" | "momentum" | "volume" | "policy" | "capital" | "name";

export const SECTOR_SORTS: { key: SectorSort; label: string; hint: string }[] = [
  { key: "score", label: "Opportunity", hint: "Share momentum, weighted by state support and visible capital" },
  { key: "momentum", label: "Momentum", hint: "Change in share of coverage, last 90 days vs the 90 before" },
  { key: "volume", label: "Coverage", hint: "Stories filed in the window" },
  { key: "policy", label: "State support", hint: "Share of coverage that is policy or subsidy news" },
  { key: "capital", label: "Capital", hint: "Share of coverage that is investment or FDI news" },
  { key: "name", label: "A–Z", hint: "Alphabetical" },
];

export function isSectorSort(value: string | undefined): value is SectorSort {
  return SECTOR_SORTS.some((sort) => sort.key === value);
}

export function sortSectors(signals: SectorSignal[], sort: SectorSort): SectorSignal[] {
  const sorted = signals.slice();
  switch (sort) {
    case "momentum":
      // Unrated sectors sink rather than sorting as zero - "not enough
      // coverage to say" is not the same as "flat".
      return sorted.sort((a, b) => (b.momentum ?? -Infinity) - (a.momentum ?? -Infinity));
    case "volume":
      return sorted.sort((a, b) => b.total - a.total);
    case "policy":
      return sorted.sort((a, b) => b.policyShare - a.policyShare);
    case "capital":
      return sorted.sort((a, b) => b.capitalShare - a.capitalShare);
    case "name":
      return sorted.sort((a, b) => a.label.localeCompare(b.label));
    default:
      return sorted.sort((a, b) => opportunityScore(b) - opportunityScore(a));
  }
}

/**
 * Twenty-five sectors, one row each.
 *
 * A table, not a chart. Twenty-five classes all carrying meaning is well past
 * the point where colour can tell them apart, and the reader's question here is
 * lookup - "where does my sector sit" - which a chart answers badly and a
 * sorted table answers exactly. The only marks are one sparkline per row, for
 * shape, and one bar per row, for direction; both are single-hue, because the
 * rows are not eight series, they are twenty-five instances of the same series.
 *
 * Eight columns need about 46rem, which is wider than a phone and wider than a
 * tablet once the page's own margins are taken off, so below `lg` the same rows
 * are rendered as an expandable list instead (see `SectorAccordion`). The table
 * is not merely hidden there: a scroller that puts every figure off-screen to
 * the right of the ranking is not a smaller version of this table, it is a
 * table nobody reads.
 */
export function SectorTable({
  signals,
  sort,
  hrefFor,
}: {
  signals: SectorSignal[];
  sort: SectorSort;
  /** Link builder for the sort headers. */
  hrefFor: (sort: SectorSort) => string;
}) {
  const rows = sortSectors(signals, sort);
  // Clamped: one sector at +400% would otherwise squash every other bar in the
  // column to a stub, and the bar is there to show direction and rough size.
  const scale = Math.min(
    Math.max(...rows.map((row) => Math.abs(row.momentum ?? 0)), 0.5),
    1.5
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="rail flex flex-wrap items-center gap-1.5">
        <span className="kicker mr-1 shrink-0 text-[10px] text-[var(--text-muted)]">Rank by</span>
        {SECTOR_SORTS.map((option) => {
          const active = option.key === sort;
          return (
            <Link
              key={option.key}
              href={hrefFor(option.key)}
              aria-current={active ? "true" : undefined}
              title={option.hint}
              className="shrink-0 border px-2.5 py-1 text-[12px] transition-colors"
              style={
                active
                  ? {
                      borderColor: "var(--text-primary)",
                      backgroundColor: "var(--text-primary)",
                      color: "var(--surface-1)",
                      fontWeight: 600,
                    }
                  : { borderColor: "var(--rule-strong)", color: "var(--text-secondary)" }
              }
            >
              {option.label}
            </Link>
          );
        })}
      </div>

      {/* The rank chips above are shared: the accordion is the same rows in the
          same order, so sorting works identically on either. */}
      <div className="lg:hidden">
        <SectorAccordion signals={rows} />
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[46rem] border-collapse text-left">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--rule-strong)" }}>
              <Th className="w-8">#</Th>
              <Th>Sector</Th>
              <Th className="text-right">Stories</Th>
              <Th className="pl-4">Shape</Th>
              <Th className="text-right">Momentum</Th>
              <Th className="text-right">State</Th>
              <Th className="text-right">Capital</Th>
              <Th className="w-24 text-right">Dashboard</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((signal, i) => {
              const momentum = signal.momentum;
              const rising = (momentum ?? 0) >= 0;
              const barWidth =
                momentum === null ? 0 : Math.min(Math.abs(momentum) / scale, 1) * 46;

              return (
                <tr
                  key={signal.key}
                  className="group border-b transition-colors hover:bg-[var(--ink-wash)]"
                  style={{ borderColor: "var(--rule)" }}
                >
                  <Td className="meta text-[var(--text-muted)]">
                    {String(i + 1).padStart(2, "0")}
                  </Td>
                  <Td>
                    <SectorLink
                      href={`/opportunities/${signal.key}`}
                      label={signal.label}
                      className="flex items-center gap-2 text-[14px] font-medium text-[var(--text-primary)]"
                    >
                      <SectorGlyph sectorKey={signal.key} />
                      <span className="underline-offset-4 group-hover:underline">
                        {signal.label}
                      </span>
                    </SectorLink>
                  </Td>
                  <Td className="meta text-right text-[12px] text-[var(--text-primary)]">
                    {count(signal.total)}
                  </Td>
                  <Td className="pl-4">
                    <Sparkline points={signal.monthly} width={84} height={22} />
                  </Td>
                  <Td className="text-right">
                    <span className="flex items-center justify-end gap-2">
                      {/* Direction as a mark, magnitude as the number beside it -
                          a signed percentage alone reads as a wall of text when
                          there are twenty-five of them down a column. */}
                      <span
                        className="hidden h-[6px] rounded-full sm:block"
                        style={{
                          width: `${barWidth}px`,
                          backgroundColor: rising ? RISING_HUE : FALLING_HUE,
                          opacity: momentum === null ? 0 : 1,
                        }}
                        aria-hidden
                      />
                      <span
                        className="meta w-[3.2rem] shrink-0 text-right text-[12px]"
                        style={{
                          color:
                            momentum === null
                              ? "var(--text-muted)"
                              : "var(--text-primary)",
                        }}
                      >
                        {percentChange(momentum)}
                      </span>
                    </span>
                  </Td>
                  <Td className="meta text-right text-[12px]">{percent(signal.policyShare)}</Td>
                  <Td className="meta text-right text-[12px]">{percent(signal.capitalShare)}</Td>
                  <Td className="text-right">
                    {/* Named, not just an arrow: the row is a line of figures,
                        and an unlabelled glyph at the end of one does not read
                        as "this opens somewhere else". */}
                    <SectorLink
                      href={`/opportunities/${signal.key}`}
                      label={signal.label}
                      hint="swap"
                      className="kicker inline-flex items-center gap-1 text-[9px] text-[var(--text-muted)] transition-colors group-hover:text-[var(--text-primary)]"
                    >
                      Open
                    </SectorLink>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** The sector's own mark, so a row is recognisable before it is read. */
function SectorGlyph({ sectorKey }: { sectorKey: string }) {
  const meta = metaForSector(sectorKey);
  const Icon = meta.icon;
  return (
    <span
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center"
      style={{
        color: `var(${meta.colorVar})`,
        backgroundColor: `color-mix(in srgb, var(${meta.colorVar}) 13%, transparent)`,
      }}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
    </span>
  );
}

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={`kicker py-2 pr-3 text-[9px] font-semibold text-[var(--text-muted)] ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`py-2.5 pr-3 align-middle ${className}`}>{children}</td>;
}
