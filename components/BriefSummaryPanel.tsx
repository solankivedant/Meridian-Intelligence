import { BriefSummary } from "@/lib/summarize";
import { metaForCategory } from "@/lib/categoryMeta";

/**
 * The one block on the page that isn't a headline: a written read of the last
 * 24 hours.
 *
 * The overview takes the narrower column and the takeaways the wider one, then
 * split into two. Given the other way round, a three-line standfirst sat beside
 * a five-item list and left half the panel empty — the narrow column gives the
 * prose enough lines to stand up to the list beside it.
 */
export function BriefSummaryPanel({ summary }: { summary: BriefSummary }) {
  return (
    <div className="grid gap-x-10 gap-y-6 lg:grid-cols-12">
      <p className="self-start text-[18px] leading-[1.62] text-[var(--text-primary)] lg:col-span-4">
        {summary.overview}
      </p>

      <ul
        className="grid gap-x-8 gap-y-3 self-start sm:grid-cols-2 lg:col-span-8 lg:border-l lg:pl-10"
        style={{ borderColor: "var(--rule)" }}
      >
        {summary.points.map((point, i) => {
          const meta = metaForCategory(point.category);
          return (
            <li key={i} className="flex gap-2.5">
              <span
                className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: `var(${meta.colorVar})` }}
                title={meta.label}
                aria-hidden
              />
              <span className="text-[13.5px] leading-[1.55] text-[var(--text-secondary)]">
                <span
                  className="kicker mr-1.5 text-[10px]"
                  style={{ color: `var(${meta.colorVar})` }}
                >
                  {meta.shortLabel}
                </span>
                {point.text}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
