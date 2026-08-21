import Link from "next/link";
import { Sparkline } from "./charts/Sparkline";
import { metaForSector } from "@/lib/sectorMeta";
import {
  COMPANY_SORTS,
  sortCompanies,
  type CompanySignal,
  type CompanySort,
} from "@/lib/company";
import { FALLING_HUE, RISING_HUE, count, percentChange } from "./charts/chartUtils";

/**
 * The company directory, one row each.
 *
 * Built on the same reasoning as `SectorTable`, and deliberately so: the
 * reader's question on a directory page is lookup - "where does this name
 * sit" - which a sorted table answers exactly and a chart answers badly. The
 * only marks are one sparkline for shape and one bar for direction, both
 * single-hue, because these rows are many instances of one series rather than
 * many series.
 *
 * The one real difference from the sector table is what happens to the long
 * tail. There are nearly three hundred companies in the dictionary and most of
 * them are named in single figures over two years, so a plain alphabetical
 * wall would bury the fifty names that carry the archive. Companies with no
 * coverage at all are dropped from the table entirely and counted in a line
 * beneath it - present in the dictionary, absent from the news, and said so
 * rather than padded out with rows of zeroes.
 */
export function CompanyTable({
  signals,
  sort,
  hrefFor,
  limit,
}: {
  signals: CompanySignal[];
  sort: CompanySort;
  hrefFor: (sort: CompanySort) => string;
  /** Rows to draw. The rest are reported as a count. */
  limit?: number;
}) {
  const covered = signals.filter((signal) => signal.total > 0);
  const ordered = sortCompanies(covered, sort);
  const rows = limit ? ordered.slice(0, limit) : ordered;
  const hidden = ordered.length - rows.length;
  const silent = signals.length - covered.length;

  // Clamped for the same reason the sector table clamps: one name at +600%
  // would squash every other bar in the column into a stub.
  const scale = Math.min(
    Math.max(...rows.map((row) => Math.abs(row.momentum ?? 0)), 0.5),
    2
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="rail flex flex-wrap items-center gap-1.5">
        <span className="kicker mr-1 shrink-0 text-[10px] text-[var(--text-muted)]">Rank by</span>
        {COMPANY_SORTS.map((option) => {
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

      {/* Below `lg` the same rows become a card list: eight columns need about
          46rem, and a horizontal scroller that puts every figure off-screen to
          the right of the name is not a smaller table, it is an unread one. */}
      <ul className="flex flex-col lg:hidden">
        {rows.map((signal, i) => (
          <li
            key={signal.company.key}
            className="flex items-center gap-3 border-b py-2.5"
            style={{ borderColor: "var(--rule)" }}
          >
            <span className="meta w-6 shrink-0 text-[var(--text-muted)]">
              {String(i + 1).padStart(2, "0")}
            </span>
            <CompanyGlyph sector={signal.company.sector} />
            <span className="min-w-0 flex-1">
              <Link
                href={`/company/${signal.company.key}`}
                className="block truncate text-[14px] font-medium text-[var(--text-primary)] underline-offset-4 hover:underline"
              >
                {signal.company.name}
              </Link>
              <span className="meta text-[10px]">
                {signal.company.ticker || "Private"} · {count(signal.total)} stories
              </span>
            </span>
            <span
              className="meta shrink-0 text-[12px]"
              style={{
                color: signal.momentum === null ? "var(--text-muted)" : "var(--text-primary)",
              }}
            >
              {percentChange(signal.momentum)}
            </span>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[46rem] border-collapse text-left">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--rule-strong)" }}>
              <Th className="w-8">#</Th>
              <Th>Company</Th>
              <Th className="w-24">Ticker</Th>
              <Th className="text-right">Stories</Th>
              <Th className="pl-4">Shape</Th>
              <Th className="text-right">Last 90d</Th>
              <Th className="text-right">Momentum</Th>
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
                  key={signal.company.key}
                  className="group border-b transition-colors hover:bg-[var(--ink-wash)]"
                  style={{ borderColor: "var(--rule)" }}
                >
                  <Td className="meta text-[var(--text-muted)]">
                    {String(i + 1).padStart(2, "0")}
                  </Td>
                  <Td>
                    <Link
                      href={`/company/${signal.company.key}`}
                      className="flex items-center gap-2 text-[14px] font-medium text-[var(--text-primary)]"
                    >
                      <CompanyGlyph sector={signal.company.sector} />
                      <span className="underline-offset-4 group-hover:underline">
                        {signal.company.name}
                      </span>
                    </Link>
                  </Td>
                  <Td>
                    {signal.company.ticker ? (
                      <span className="meta text-[11px] text-[var(--text-secondary)]">
                        {signal.company.ticker}
                      </span>
                    ) : (
                      // Not a blank: "private" is information, and the reason a
                      // name a reader recognises has no symbol beside it.
                      <span className="kicker text-[9px] text-[var(--text-muted)]">Private</span>
                    )}
                  </Td>
                  <Td className="meta text-right text-[12px] text-[var(--text-primary)]">
                    {count(signal.total)}
                  </Td>
                  <Td className="pl-4">
                    <Sparkline points={signal.monthly} width={84} height={22} />
                  </Td>
                  <Td className="meta text-right text-[12px]">{count(signal.recent)}</Td>
                  <Td className="text-right">
                    <span className="flex items-center justify-end gap-2">
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
                            momentum === null ? "var(--text-muted)" : "var(--text-primary)",
                        }}
                      >
                        {percentChange(momentum)}
                      </span>
                    </span>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[12.5px] leading-relaxed text-[var(--text-muted)]">
        {hidden > 0 && <>{count(hidden)} more companies with coverage are not shown. </>}
        {silent > 0 && (
          <>
            {count(silent)} of the {count(signals.length)} companies in the dictionary were not
            named at all in this window.
          </>
        )}
      </p>
    </div>
  );
}

/** The sector's mark, so a row is recognisable before it is read. */
function CompanyGlyph({ sector }: { sector: string }) {
  const meta = metaForSector(sector);
  const Icon = meta.icon;
  return (
    <span
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center"
      style={{
        color: `var(${meta.colorVar})`,
        backgroundColor: `color-mix(in srgb, var(${meta.colorVar}) 13%, transparent)`,
      }}
      title={meta.label}
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
