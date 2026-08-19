import Link from "next/link";
import { Check } from "lucide-react";
import { Category } from "@/lib/enums";
import { CATEGORY_META } from "@/lib/categoryMeta";
import { SectionIcon } from "./MetaIcon";
import { feedHref, type ParsedFeedParams } from "@/lib/feedQuery";

/**
 * Eight readings in one band, each a count plus a share-of-total meter, and
 * each one a filter.
 *
 * The panel used to be a set of links out to eight separate section pages -
 * which meant that acting on what it showed you ("policy is the story today")
 * cost you every filter you had set, and landed you somewhere the pulse itself
 * wasn't. Now a meter toggles its own section into the feed above it: the
 * reading and the acting happen in the same place, selections combine, and the
 * result stays a shareable URL.
 *
 * Bars are measured against the busiest section rather than the total, because
 * the question the panel answers is comparative - a shared maximum is what
 * makes a skew visible at a glance.
 */
export function CategoryPulse({
  counts,
  basePath,
  filters,
}: {
  counts: Map<Category, number>;
  /** Where the meters link. Omit to render the panel as a plain readout. */
  basePath?: string;
  filters?: ParsedFeedParams;
}) {
  const values = CATEGORY_META.map((meta) => counts.get(meta.category) ?? 0);
  const max = Math.max(...values, 1);
  const total = values.reduce((sum, value) => sum + value, 0);
  const selected = filters?.cats ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
        {CATEGORY_META.map((meta, i) => {
          const count = values[i];
          const active = selected.includes(meta.category);
          // Selecting one section while others are already selected adds to the
          // set; the everyday case of "just this one" is a click on a clean panel.
          const next = active
            ? selected.filter((category) => category !== meta.category)
            : [...selected, meta.category];

          const href =
            basePath && filters
              ? `${feedHref(basePath, { ...filters, cats: next })}#archive`
              : `/category/${meta.slug}`;

          return (
            <Link
              key={meta.slug}
              href={href}
              scroll={false}
              aria-pressed={basePath ? active : undefined}
              title={
                basePath
                  ? active
                    ? `Stop filtering the feed by ${meta.label}`
                    : `Filter the feed to ${meta.label}`
                  : meta.label
              }
              className="group flex flex-col gap-1.5"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className="flex min-w-0 items-center gap-1 truncate text-[13px] transition-colors group-hover:text-[var(--text-primary)]"
                  style={{
                    color: active ? "var(--text-primary)" : "var(--text-secondary)",
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {active ? (
                    <Check
                      className="h-3 w-3 shrink-0"
                      style={{ color: `var(${meta.colorVar})` }}
                      aria-hidden
                    />
                  ) : (
                    <SectionIcon meta={meta} size="xs" />
                  )}
                  <span className="truncate">{meta.label}</span>
                </span>
                <span
                  className="shrink-0 text-[17px] font-medium tabular-nums"
                  style={{ color: count > 0 ? "var(--text-primary)" : "var(--text-muted)" }}
                >
                  {count}
                </span>
              </div>
              <div
                className="h-[3px] w-full overflow-hidden rounded-full"
                style={{ backgroundColor: "var(--ink-wash)" }}
              >
                <span
                  className="block h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: `${Math.round((count / max) * 100)}%`,
                    backgroundColor: `var(${meta.colorVar})`,
                    // An unselected meter recedes once a selection exists, so
                    // the panel shows what is being read as well as what is there.
                    opacity: selected.length === 0 || active ? 1 : 0.35,
                  }}
                  aria-hidden
                />
              </div>
              {/* Share of the window's volume - repeating the time window under
                  every bar would only restate the section heading. */}
              <span className="meta">
                {total > 0 ? `${Math.round((count / total) * 100)}% of window` : "-"}
              </span>
            </Link>
          );
        })}
      </div>

      {basePath && filters && (
        <p
          className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-3 text-[12px] text-[var(--text-muted)]"
          style={{ borderColor: "var(--rule)" }}
        >
          {selected.length > 0 ? (
            <>
              <span className="text-[var(--text-secondary)]">
                Feed filtered to {selected.length}{" "}
                {selected.length === 1 ? "section" : "sections"}.
              </span>
              <Link
                href={`${feedHref(basePath, { ...filters, cats: [] })}#archive`}
                scroll={false}
                className="underline underline-offset-2 transition-colors hover:text-[var(--text-primary)]"
              >
                Show every section
              </Link>
              <Link
                href={`${feedHref(basePath, { ...filters, sort: "section" })}#archive`}
                scroll={false}
                className="underline underline-offset-2 transition-colors hover:text-[var(--text-primary)]"
              >
                Group the feed by section
              </Link>
            </>
          ) : (
            <span>Tap any section to filter the feed above it. Selections combine.</span>
          )}
        </p>
      )}
    </div>
  );
}
