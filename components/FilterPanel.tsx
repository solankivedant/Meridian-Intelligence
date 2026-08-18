import Link from "next/link";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
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

/** What the closed sector control says it is currently doing. */
function sectorSummary(tags: string[]): string {
  if (tags.length === 0) return "All sectors";
  if (tags.length === 1) {
    return TAG_META.find((t) => t.key === tags[0])?.label ?? "1 sector";
  }
  return `${tags.length} sectors`;
}

/**
 * Filters live in an explicitly framed, tinted panel rather than floating as a
 * loose row of pills — previously they read as content, and on a page that is
 * mostly headlines the controls were the hardest thing to find.
 *
 * All three controls sit on one line. Stacked in labelled rows they cost four
 * lines of height above every feed while leaving two thirds of each row empty;
 * the twenty-six sector chips are the only part that genuinely needs the room,
 * so they alone drop into a panel under the row when opened.
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
    // Positioned, because the sector drawer opens across the panel's full
    // width rather than out of the control that owns it — anchored to the
    // control it would hang off the section's right edge.
    <div
      className="relative mb-7 border"
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
          <span className="meta" role="status" aria-live="polite">
            {resultCount.toLocaleString("en-IN")} matching stories
          </span>
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

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3">
        <Group label="Period">
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
        </Group>

        <Divider />

        <Group label="Month">
          <form action={basePath} method="GET" className="flex items-center gap-1.5">
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
        </Group>

        <Divider />

        <Group label="Sector">
          <details className="group/sector">
            <summary
              className="flex cursor-pointer list-none items-center gap-1.5 border px-2.5 py-1 text-[12px] transition-colors [&::-webkit-details-marker]:hidden"
              style={
                tags.length > 0
                  ? {
                      borderColor: "var(--cat-policy)",
                      backgroundColor: "color-mix(in srgb, var(--cat-policy) 12%, var(--surface-1))",
                      color: "var(--cat-policy)",
                      fontWeight: 600,
                    }
                  : {
                      borderColor: "var(--rule-strong)",
                      backgroundColor: "var(--surface-1)",
                      color: "var(--text-secondary)",
                    }
              }
            >
              {sectorSummary(tags)}
              <ChevronDown
                className="h-3.5 w-3.5 shrink-0 transition-transform group-open/sector:rotate-180"
                aria-hidden
              />
            </summary>

            <div
              className="absolute inset-x-0 top-full z-20 flex flex-wrap gap-1.5 border-t p-3 shadow-lg"
              style={{ borderColor: "var(--rule-strong)", backgroundColor: "var(--surface-1)" }}
            >
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
        </Group>
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="kicker shrink-0 text-[10px] text-[var(--text-muted)]">{label}</span>
      <div className="flex flex-wrap items-center gap-1">{children}</div>
    </div>
  );
}

/** Hairline between the three controls, drawn only when they share a line. */
function Divider() {
  return (
    <span
      className="hidden h-5 w-px shrink-0 lg:block"
      style={{ backgroundColor: "var(--rule-strong)" }}
      aria-hidden
    />
  );
}
