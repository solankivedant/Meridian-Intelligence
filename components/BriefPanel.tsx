import { Category } from "@prisma/client";
import { metaForCategory } from "@/lib/categoryMeta";
import { timeAgo } from "@/lib/formatTime";

export type BriefEntry = {
  id: string;
  title: string;
  url: string;
  sourceName: string;
  publishedAt: Date;
  category: Category;
};

/**
 * A numbered list, deliberately unlike everything else on the page. The lead
 * beside it is one big serif block and the feed below is a run of rows, so the
 * brief earns its own shape: enumerated, tight, one line of provenance each.
 */
export function BriefPanel({ entries }: { entries: BriefEntry[] }) {
  return (
    <ol className="flex flex-col">
      {entries.map((entry, i) => {
        const meta = metaForCategory(entry.category);
        return (
          <li
            key={entry.id}
            className="group border-b py-3 first:pt-0 last:border-b-0"
            style={{ borderColor: "var(--rule)" }}
          >
            <a
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-3"
            >
              <span
                className="meta shrink-0 pt-[3px] tabular-nums"
                style={{ color: `var(${meta.colorVar})` }}
                aria-hidden
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0">
                <span className="headline-tight block text-[15px] text-[var(--text-primary)]">
                  <span className="link-underline">{entry.title}</span>
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-[var(--text-muted)]">
                  <span style={{ color: `var(${meta.colorVar})` }}>{meta.shortLabel}</span>
                  <span aria-hidden>·</span>
                  <span>{entry.sourceName}</span>
                  <span aria-hidden>·</span>
                  <span>{timeAgo(entry.publishedAt)}</span>
                </span>
              </span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}
