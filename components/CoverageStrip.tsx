import type { Coverage } from "@/lib/coverage";
import { shortDate, timeAgo } from "@/lib/formatTime";

/**
 * The masthead's standing figures: how much archive there is, and how fresh.
 *
 * One wrapping row above `sm`, a two-column grid below it. Four value-and-label
 * pairs left to wrap on a phone break wherever the widest of them happens to
 * land, so the strip came out as three ragged lines with the labels no longer
 * under anything - which is neither a row nor a column, and reads as neither. A
 * grid pins them to two columns and the type steps down a size to fit, so the
 * whole strip is two tidy lines instead of three loose ones.
 */
export function CoverageStrip({ coverage, desk }: { coverage: Coverage; desk: string }) {
  if (coverage.stories === 0) return null;

  return (
    <div
      className="grid grid-cols-2 gap-x-3 gap-y-1.5 border px-3 py-2 sm:flex sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-1 sm:px-4 sm:py-2.5"
      style={{ borderColor: "var(--rule)", backgroundColor: "var(--surface-2)" }}
    >
      {/* The desk name is the strip's heading, so it takes its own line rather
          than sitting in a column as if it were a fifth figure. */}
      <span className="kicker col-span-2 text-[9px] text-[var(--text-primary)] sm:text-[10px]">
        {desk}
      </span>
      <Stat value={coverage.stories.toLocaleString("en-IN")} label="stories" />
      <Stat value={coverage.sources.toLocaleString("en-IN")} label="sources" />
      {coverage.oldestAt && (
        <Stat value={shortDate(new Date(coverage.oldestAt))} label="oldest story" />
      )}
      {coverage.updatedAt && (
        <Stat value={timeAgo(new Date(coverage.updatedAt))} label="last update" />
      )}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <span className="flex min-w-0 items-baseline gap-1.5">
      <span className="shrink-0 text-[12px] font-medium tabular-nums text-[var(--text-primary)] sm:text-[13px]">
        {value}
      </span>
      <span className="kicker min-w-0 truncate text-[9px] text-[var(--text-muted)] sm:text-[10px]">
        {label}
      </span>
    </span>
  );
}
