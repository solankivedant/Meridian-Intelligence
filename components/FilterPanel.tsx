"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { SlidersHorizontal, ChevronDown, ArrowDownWideNarrow } from "lucide-react";
import { TIME_RANGES, TimeRangeKey, monthOptions } from "@/lib/timeRange";
import { TAG_META } from "@/lib/categorize";
import { Category } from "@/lib/enums";
import { CATEGORY_META } from "@/lib/categoryMeta";
import { SORTS, SortKey, categorySlugs, feedHref } from "@/lib/feedQuery";

export type FeedFilters = {
  range: TimeRangeKey;
  tags: string[];
  cats: Category[];
  sort: SortKey;
  month: string;
};

/** What the closed section control says it is currently doing. */
function sectionSummary(cats: Category[]): string {
  if (cats.length === 0) return "All sections";
  if (cats.length === 1) {
    return CATEGORY_META.find((meta) => meta.category === cats[0])?.shortLabel ?? "1 section";
  }
  return `${cats.length} sections`;
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
 * loose row of pills - previously they read as content, and on a page that is
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
  counts,
  showSections = true,
}: {
  basePath: string;
  filters: FeedFilters;
  resultCount?: number;
  /** Stories per section in the current window - drawn beside each chip. */
  counts?: Map<Category, number>;
  /** False on a section page, where there is nothing left to narrow. */
  showSections?: boolean;
}) {
  const { range, tags, cats, sort, month } = filters;
  const hasFilters = tags.length > 0 || cats.length > 0 || sort !== "new" || month !== "";
  const months = monthOptions();
  const carry = { range, tags, cats, sort, month };
  const [open, setOpen] = useState(hasFilters);
  const contentId = useId();

  return (
    // Positioned, because the sector drawer opens across the panel's full
    // width rather than out of the control that owns it - anchored to the
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
        <span className="ml-auto flex items-center gap-2">
          {hasFilters && (
            <Link
              href={feedHref(basePath, { range })}
              className="kicker text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            >
              Reset
            </Link>
          )}
          <button
            type="button"
            aria-expanded={open}
            aria-controls={contentId}
            onClick={() => setOpen((value) => !value)}
            className="kicker inline-flex items-center gap-1 border px-2 py-1 text-[10px] text-[var(--text-secondary)] md:hidden"
            style={{ borderColor: "var(--rule-strong)" }}
          >
            {open ? "Hide" : "Show"}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
        </span>
      </div>

      <div
        id={contentId}
        className={`${open ? "flex" : "hidden"} flex-wrap items-start gap-x-4 gap-y-3 px-4 py-3 md:flex md:items-center`}
      >
        <Group label="Period">
          {TIME_RANGES.map((r) => {
            const active = !month && r.key === range;
            return (
              <Link
                key={r.key}
                // Picking a relative range drops any active month selection -
                // the two are alternative browsing modes, not combined.
                href={feedHref(basePath, { ...carry, range: r.key, month: "" })}
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
            <input type="hidden" name="cats" value={categorySlugs(cats).join(",")} />
            <input type="hidden" name="sort" value={sort} />
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

        {showSections && (
          <>
            <Divider />

            {/* The same eight sections the pulse meters, as a filter. Reading
                the day's skew and then acting on it - policy is busy today,
                show me only that - was previously a trip to a section page
                that dropped every other filter on the way. */}
            <Group label="Section">
              <details className="group/section w-full sm:w-auto">
                <summary
                  className="flex cursor-pointer list-none items-center gap-1.5 border px-2.5 py-1 text-[12px] transition-colors [&::-webkit-details-marker]:hidden"
                  style={
                    cats.length > 0
                      ? {
                          borderColor: "var(--text-primary)",
                          backgroundColor: "var(--ink-wash)",
                          color: "var(--text-primary)",
                          fontWeight: 600,
                        }
                      : {
                          borderColor: "var(--rule-strong)",
                          backgroundColor: "var(--surface-1)",
                          color: "var(--text-secondary)",
                        }
                  }
                >
                  {sectionSummary(cats)}
                  <ChevronDown
                    className="h-3.5 w-3.5 shrink-0 transition-transform group-open/section:rotate-180"
                    aria-hidden
                  />
                </summary>

                <div
                  className="static z-20 mt-2 grid w-full gap-1.5 border-t p-3 shadow-lg md:absolute md:inset-x-0 md:top-full md:mt-0 md:grid-cols-2 lg:grid-cols-4"
                  style={{ borderColor: "var(--rule-strong)", backgroundColor: "var(--surface-1)" }}
                >
                  {CATEGORY_META.map((meta) => {
                    const active = cats.includes(meta.category);
                    const next = active
                      ? cats.filter((c) => c !== meta.category)
                      : [...cats, meta.category];
                    const count = counts?.get(meta.category);
                    return (
                      <Link
                        key={meta.slug}
                        href={feedHref(basePath, { ...carry, cats: next })}
                        aria-pressed={active}
                        className="flex items-center gap-2 border px-2 py-1 text-[12px] transition-colors"
                        style={{
                          borderColor: active ? `var(${meta.colorVar})` : "var(--rule)",
                          backgroundColor: active
                            ? `color-mix(in srgb, var(${meta.colorVar}) 13%, var(--surface-1))`
                            : "var(--surface-1)",
                          color: active ? "var(--text-primary)" : "var(--text-secondary)",
                          fontWeight: active ? 600 : 400,
                        }}
                      >
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: `var(${meta.colorVar})` }}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate">{meta.label}</span>
                        {count !== undefined && <span className="meta shrink-0">{count}</span>}
                      </Link>
                    );
                  })}
                </div>
              </details>
            </Group>
          </>
        )}

        <Divider />

        <Group label="Sector">
          <details className="group/sector w-full sm:w-auto">
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
              className="static z-20 mt-2 flex w-full flex-wrap gap-1.5 border-t p-3 shadow-lg md:absolute md:inset-x-0 md:top-full md:mt-0"
              style={{ borderColor: "var(--rule-strong)", backgroundColor: "var(--surface-1)" }}
            >
              {TAG_META.map((t) => {
                const active = tags.includes(t.key);
                const next = active ? tags.filter((x) => x !== t.key) : [...tags, t.key];
                return (
                  <Link
                    key={t.key}
                    href={feedHref(basePath, { ...carry, tags: next })}
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

        <Divider />

        <Group label="Sort">
          {SORTS.map((option) => {
            const active = option.key === sort;
            return (
              <Link
                key={option.key}
                href={feedHref(basePath, { ...carry, sort: option.key })}
                aria-current={active ? "true" : undefined}
                title={option.hint}
                className="flex items-center gap-1 border px-2.5 py-1 text-[12px] transition-colors"
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
                {active && <ArrowDownWideNarrow className="h-3 w-3 shrink-0" aria-hidden />}
                {option.label}
              </Link>
            );
          })}
        </Group>
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-1.5 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
      <span className="kicker shrink-0 text-[10px] text-[var(--text-muted)]">{label}</span>
      <div className="flex min-w-0 flex-wrap items-center gap-1">{children}</div>
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
