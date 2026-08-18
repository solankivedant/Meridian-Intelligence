import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { TIME_RANGES, TimeRangeKey, monthOptions } from "@/lib/timeRange";
import { TAG_META } from "@/lib/categorize";

export type FeedFilters = {
  range: TimeRangeKey;
  tags: string[];
  month: string;
};

function buildHref(
  basePath: string,
  { range, tags, month }: { range?: string; tags?: string[]; month?: string }
) {
  const search = new URLSearchParams();
  if (range) search.set("range", range);
  if (tags?.length) search.set("tags", tags.join(","));
  if (month) search.set("month", month);
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/**
 * Filters live in an explicitly framed, tinted panel rather than floating as a
 * loose row of pills — previously they read as content, and on a page that is
 * mostly headlines the controls were the hardest thing to find.
 *
 * Sector selection is multiple-choice and driven entirely by links: each chip
 * toggles itself in the `tags` query parameter, so combinations stay
 * shareable, bookmarkable and work without client JavaScript.
 */
export function FilterPanel({
  basePath,
  filters,
  resultCount,
}: {
  basePath: string;
  filters: FeedFilters;
  resultCount?: number;
}) {
  const { range, tags, month } = filters;
  const hasFilters = tags.length > 0 || month !== "";
  const months = monthOptions();

  return (
    <div
      className="mb-7 border"
      style={{ borderColor: "var(--rule-strong)", backgroundColor: "var(--surface-2)" }}
    >
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2"
        style={{ borderColor: "var(--rule)" }}
      >
        <span className="kicker flex items-center gap-1.5 text-[var(--text-primary)]">
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
          Filters
        </span>
        {typeof resultCount === "number" && (
          <span className="meta">{resultCount.toLocaleString("en-IN")} matching stories</span>
        )}
        {hasFilters && (
          <Link
            href={buildHref(basePath, { range })}
            className="kicker ml-auto text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            Reset
          </Link>
        )}
      </div>

      <Row label="Period">
        <div className="flex flex-wrap items-center gap-1">
          {TIME_RANGES.map((r) => {
            const active = !month && r.key === range;
            return (
              <Link
                key={r.key}
                // Picking a relative range drops any active month selection —
                // the two are alternative browsing modes, not combined.
                href={buildHref(basePath, { range: r.key, tags })}
                aria-current={active ? "true" : undefined}
                className="border px-2.5 py-1 text-[12px] transition-colors"
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
                {r.label}
              </Link>
            );
          })}
        </div>
      </Row>

      <Row label="Month">
        <form action={basePath} method="GET" className="flex items-center gap-2">
          <input type="hidden" name="tags" value={tags.join(",")} />
          <select
            name="month"
            defaultValue={month}
            aria-label="Browse a specific month"
            className="border bg-transparent px-2 py-1 text-[12px] text-[var(--text-primary)] outline-none"
            style={{
              borderColor: month ? "var(--text-primary)" : "var(--rule-strong)",
              backgroundColor: "var(--surface-1)",
            }}
          >
            <option value="">Any month</option>
            {months.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="kicker border px-2.5 py-1 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            style={{ borderColor: "var(--rule-strong)" }}
          >
            Go
          </button>
        </form>
      </Row>

      <Row label="Sectors" last>
        <details className="w-full" open={tags.length > 0}>
          <summary className="cursor-pointer text-[12px] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
            {tags.length === 0
              ? "All sectors — choose one or more"
              : `${tags.length} selected — edit`}
          </summary>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {TAG_META.map((t) => {
              const active = tags.includes(t.key);
              const next = active ? tags.filter((x) => x !== t.key) : [...tags, t.key];
              return (
                <Link
                  key={t.key}
                  href={buildHref(basePath, { range, month, tags: next })}
                  aria-pressed={active}
                  className="border px-2 py-0.5 text-[11px] transition-colors"
                  style={
                    active
                      ? {
                          borderColor: "var(--cat-policy)",
                          backgroundColor:
                            "color-mix(in srgb, var(--cat-policy) 15%, var(--surface-1))",
                          color: "var(--cat-policy)",
                          fontWeight: 600,
                        }
                      : {
                          borderColor: "var(--rule)",
                          color: "var(--text-secondary)",
                          backgroundColor: "var(--surface-1)",
                        }
                  }
                >
                  {t.label}
                </Link>
              );
            })}
          </div>
        </details>
      </Row>
    </div>
  );
}

function Row({
  label,
  children,
  last = false,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-start sm:gap-4 ${last ? "" : "border-b"}`}
      style={{ borderColor: "var(--rule)" }}
    >
      <span className="kicker shrink-0 pt-1 text-[10px] text-[var(--text-muted)] sm:w-16">
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
