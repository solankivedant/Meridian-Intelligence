import type { Coverage } from "@/lib/coverage";
import { shortDate, timeAgo } from "@/lib/formatTime";

/** The masthead's standing figures: how much archive there is, and how fresh. */
export function CoverageStrip({ coverage, desk }: { coverage: Coverage; desk: string }) {
  if (coverage.stories === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-x-6 gap-y-1 border px-4 py-2.5"
      style={{ borderColor: "var(--rule)", backgroundColor: "var(--surface-2)" }}
    >
      <span className="kicker text-[10px] text-[var(--text-primary)]">{desk}</span>
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
    <span className="flex items-baseline gap-1.5">
      <span className="text-[13px] font-medium tabular-nums text-[var(--text-primary)]">
        {value}
      </span>
      <span className="kicker text-[10px] text-[var(--text-muted)]">{label}</span>
    </span>
  );
}
