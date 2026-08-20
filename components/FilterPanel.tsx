"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { SlidersHorizontal, ChevronDown, ArrowDownWideNarrow, Radio, X } from "lucide-react";
import { TIME_RANGES, TimeRangeKey, monthOptions } from "@/lib/timeRange";
import { TAG_META } from "@/lib/categorize";
import { Category } from "@/lib/enums";
import { CATEGORY_META } from "@/lib/categoryMeta";
import { metaForSector } from "@/lib/sectorMeta";
import { MAX_SOURCE_LENGTH, SORTS, SortKey, categorySlugs, feedHref } from "@/lib/feedQuery";

export type FeedFilters = {
  range: TimeRangeKey;
  tags: string[];
  cats: Category[];
  sort: SortKey;
  month: string;
  /** Publisher name fragment. Empty means every publisher. */
  src: string;
};

/** Which of the two pickers is expanded. Never both. */
type Drawer = "section" | "sector" | null;

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
 * All five controls sit on one line. The section and sector pickers need far
 * more room than a line has, so they open into a drawer *underneath* the
 * control row, inside the panel's own border and in the normal flow of the
 * page. They used to open as absolutely-positioned overlays hanging off the
 * panel's bottom edge, which dropped a floating slab across the first row of
 * stories - it read as a rendering fault rather than a menu, and the two could
 * overlap each other. In flow, the panel simply grows, the feed moves down and
 * nothing is ever covered. Only one drawer is open at a time, for the same
 * reason.
 *
 * Selection is multiple-choice and driven entirely by links: each chip toggles
 * itself in the query string, so combinations stay shareable, bookmarkable and
 * work without client JavaScript.
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
  const { range, tags, cats, sort, month, src } = filters;
  const hasFilters =
    tags.length > 0 || cats.length > 0 || sort !== "new" || month !== "" || src !== "";
  const months = monthOptions();
  const carry = { range, tags, cats, sort, month, src };
  const [open, setOpen] = useState(hasFilters);
  const [drawer, setDrawer] = useState<Drawer>(null);
  const contentId = useId();
  const drawerId = useId();

  const toggle = (which: Exclude<Drawer, null>) =>
    setDrawer((current) => (current === which ? null : which));

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
          <span className="meta" role="status" aria-live="polite">
            {resultCount.toLocaleString("en-IN")} matching stories
            {src && <> from publishers named &ldquo;{src}&rdquo;</>}
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

      <div id={contentId} className={open ? "block" : "hidden md:block"}>
        <div className="flex flex-wrap items-start gap-x-4 gap-y-3 px-4 py-3 md:items-center">
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
              <Carry filters={filters} except="month" />
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

          {/* Narrowing to one publisher. A reader who trusts the RBI's own
              releases over a paper's write-up of them, or who wants to read one
              wire end to end, was previously stuck scrolling the feed looking
              at bylines. It is a free-text fragment rather than a menu because
              the archive holds well over a thousand publishers - see the note
              in `buildFeedWhere`. */}
          <Group label="Source">
            <form action={basePath} method="GET" className="flex min-w-0 items-center gap-1.5">
              <Carry filters={filters} except="src" />
              <span
                className="flex min-w-0 items-center gap-1.5 border px-2 py-1"
                style={{
                  borderColor: src ? "var(--text-primary)" : "var(--rule-strong)",
                  backgroundColor: "var(--surface-1)",
                }}
              >
                <Radio className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" aria-hidden />
                <input
                  type="search"
                  name="src"
                  defaultValue={src}
                  maxLength={MAX_SOURCE_LENGTH}
                  placeholder="Any publisher"
                  aria-label="Show only stories from publishers whose name contains"
                  autoComplete="off"
                  className="w-[8.5rem] min-w-0 bg-transparent text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                />
              </span>
              <button
                type="submit"
                className="kicker border px-2.5 py-1 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                style={{ borderColor: "var(--rule-strong)" }}
              >
                Go
              </button>
              {/* Clearing through a link rather than an emptied field, so the
                  publisher leaves the URL instead of sitting in it as `src=`. */}
              {src && (
                <Link
                  href={feedHref(basePath, { ...carry, src: "" })}
                  aria-label="Show every publisher again"
                  className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </Link>
              )}
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
                <PickerButton
                  label={sectionSummary(cats)}
                  open={drawer === "section"}
                  active={cats.length > 0}
                  controls={drawerId}
                  accent="var(--text-primary)"
                  onClick={() => toggle("section")}
                />
              </Group>
            </>
          )}

          <Divider />

          <Group label="Sector">
            <PickerButton
              label={sectorSummary(tags)}
              open={drawer === "sector"}
              active={tags.length > 0}
              controls={drawerId}
              accent="var(--cat-policy)"
              onClick={() => toggle("sector")}
            />
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

        {drawer === "section" && showSections && (
          <DrawerPanel
            id={drawerId}
            title="Pick any number of sections"
            onClose={() => setDrawer(null)}
            clearHref={cats.length > 0 ? feedHref(basePath, { ...carry, cats: [] }) : undefined}
          >
            <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
              {CATEGORY_META.map((meta) => {
                const active = cats.includes(meta.category);
                const next = active
                  ? cats.filter((c) => c !== meta.category)
                  : [...cats, meta.category];
                const count = counts?.get(meta.category);
                const Icon = meta.icon;
                return (
                  <Link
                    key={meta.slug}
                    href={feedHref(basePath, { ...carry, cats: next })}
                    aria-pressed={active}
                    className="flex items-center gap-2 border px-2 py-1.5 text-[12px] transition-colors"
                    style={{
                      borderColor: active ? `var(${meta.colorVar})` : "var(--rule)",
                      backgroundColor: active
                        ? `color-mix(in srgb, var(${meta.colorVar}) 13%, var(--surface-1))`
                        : "var(--surface-1)",
                      color: active ? "var(--text-primary)" : "var(--text-secondary)",
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    <Icon
                      className="h-4 w-4 shrink-0"
                      style={{ color: `var(${meta.colorVar})` }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate">{meta.label}</span>
                    {count !== undefined && <span className="meta shrink-0">{count}</span>}
                  </Link>
                );
              })}
            </div>
          </DrawerPanel>
        )}

        {drawer === "sector" && (
          <DrawerPanel
            id={drawerId}
            title="Pick any number of sectors"
            onClose={() => setDrawer(null)}
            clearHref={tags.length > 0 ? feedHref(basePath, { ...carry, tags: [] }) : undefined}
          >
            <div className="flex flex-wrap gap-1.5">
              {TAG_META.map((t) => {
                const active = tags.includes(t.key);
                const next = active ? tags.filter((x) => x !== t.key) : [...tags, t.key];
                const meta = metaForSector(t.key);
                const Icon = meta.icon;
                return (
                  <Link
                    key={t.key}
                    href={feedHref(basePath, { ...carry, tags: next })}
                    aria-pressed={active}
                    className="flex items-center gap-1.5 border px-2 py-1 text-[11px] transition-colors"
                    style={
                      active
                        ? {
                            borderColor: `var(${meta.colorVar})`,
                            backgroundColor: `color-mix(in srgb, var(${meta.colorVar}) 15%, var(--surface-1))`,
                            color: "var(--text-primary)",
                            fontWeight: 600,
                          }
                        : {
                            borderColor: "var(--rule)",
                            color: "var(--text-secondary)",
                            backgroundColor: "var(--surface-1)",
                          }
                    }
                  >
                    <Icon
                      className="h-3.5 w-3.5 shrink-0"
                      style={{ color: `var(${meta.colorVar})` }}
                      aria-hidden
                    />
                    {t.label}
                  </Link>
                );
              })}
            </div>
          </DrawerPanel>
        )}
      </div>
    </div>
  );
}

/** The closed state of a picker: what it is set to, and that it opens. */
function PickerButton({
  label,
  open,
  active,
  accent,
  controls,
  onClick,
}: {
  label: string;
  open: boolean;
  active: boolean;
  accent: string;
  controls: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-controls={open ? controls : undefined}
      className="flex items-center gap-1.5 border px-2.5 py-1 text-[12px] transition-colors"
      style={
        active
          ? {
              borderColor: accent,
              backgroundColor: `color-mix(in srgb, ${accent} 12%, var(--surface-1))`,
              color: accent,
              fontWeight: 600,
            }
          : {
              borderColor: open ? "var(--text-primary)" : "var(--rule-strong)",
              backgroundColor: "var(--surface-1)",
              color: "var(--text-secondary)",
            }
      }
    >
      {label}
      <ChevronDown
        className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        aria-hidden
      />
    </button>
  );
}

/** The expanded picker: a full-width band inside the panel, not over the page. */
function DrawerPanel({
  id,
  title,
  clearHref,
  onClose,
  children,
}: {
  id: string;
  title: string;
  clearHref?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      className="border-t px-4 py-3"
      style={{ borderColor: "var(--rule-strong)", backgroundColor: "var(--surface-1)" }}
    >
      <div className="mb-2 flex items-center gap-3">
        <span className="kicker text-[9px] text-[var(--text-muted)]">{title}</span>
        <span className="ml-auto flex items-center gap-3">
          {clearHref && (
            <Link
              href={clearHref}
              className="kicker text-[9px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            >
              Clear
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close the picker"
            className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </span>
      </div>
      {children}
    </div>
  );
}

/**
 * The facets a GET form has to hand back, as hidden fields.
 *
 * Two controls submit rather than link - the month select and the publisher
 * field - and a form posts only its own inputs, so anything not restated here
 * is dropped on submit. Defaults are left out so the everyday URL stays short,
 * and the control's own facet is excluded because its visible input owns it.
 */
function Carry({ filters, except }: { filters: FeedFilters; except: "month" | "src" }) {
  const values: Record<string, string> = {
    range: filters.range,
    tags: filters.tags.join(","),
    cats: categorySlugs(filters.cats).join(","),
    sort: filters.sort === "new" ? "" : filters.sort,
    month: filters.month,
    src: filters.src,
  };

  return (
    <>
      {Object.entries(values)
        .filter(([key, value]) => key !== except && value !== "")
        .map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
    </>
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

/** Hairline between the controls, drawn only when they share a line. */
function Divider() {
  return (
    <span
      className="hidden h-5 w-px shrink-0 lg:block"
      style={{ backgroundColor: "var(--rule-strong)" }}
      aria-hidden
    />
  );
}
