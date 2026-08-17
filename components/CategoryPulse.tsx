import Link from "next/link";
import { Category } from "@prisma/client";
import { CATEGORY_META } from "@/lib/categoryMeta";

/**
 * Eight readings in one band, each a count plus a share-of-total meter. The
 * previous version gave every category an identical bordered tile, which made
 * a comparison impossible to actually see — bars against a shared maximum
 * make the day's skew legible at a glance.
 */
export function CategoryPulse({ counts }: { counts: Map<Category, number> }) {
  const values = CATEGORY_META.map((meta) => counts.get(meta.category) ?? 0);
  const max = Math.max(...values, 1);
  const total = values.reduce((sum, v) => sum + v, 0);

  return (
    <div
      className="grid grid-cols-2 gap-x-6 gap-y-4 border-y py-5 sm:grid-cols-4"
      style={{ borderColor: "var(--rule)" }}
    >
      {CATEGORY_META.map((meta, i) => {
        const count = values[i];
        return (
          <Link
            key={meta.slug}
            href={`/category/${meta.slug}`}
            className="group flex flex-col gap-1.5"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[13px] text-[var(--text-secondary)] transition-colors group-hover:text-[var(--text-primary)]">
                {meta.label}
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
                }}
                aria-hidden
              />
            </div>
            {/* Share of the day's volume — repeating the time window under
                every bar would only restate the section heading. */}
            <span className="meta">
              {total > 0 ? `${Math.round((count / total) * 100)}% of day` : "—"}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
