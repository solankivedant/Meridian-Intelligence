import type { ReactNode } from "react";

/**
 * A number that does not need a chart.
 *
 * "Stories in the last year" is one value; drawn as a one-bar bar chart it
 * would be a chart with nothing to compare. The tile is the honest form: a
 * label, the figure at display size, and — where there is one — the change
 * that gives it context, since a number without a direction is a number a
 * reader cannot act on.
 */
export function StatTile({
  label,
  value,
  delta,
  deltaTone = "neutral",
  note,
}: {
  label: string;
  value: string;
  /** e.g. "+42% on last year". Omit where nothing meaningful compares. */
  delta?: string;
  deltaTone?: "up" | "down" | "neutral";
  /** One line under the figure — what it is measured over, or a caveat. */
  note?: ReactNode;
}) {
  const deltaColor =
    deltaTone === "up"
      ? "var(--cat-policy)"
      : deltaTone === "down"
        ? "var(--cat-subsidy)"
        : "var(--text-muted)";

  return (
    <div
      className="flex flex-col gap-1 border-l py-1 pl-3"
      style={{ borderColor: "var(--rule-strong)" }}
    >
      <span className="kicker text-[9px] text-[var(--text-muted)]">{label}</span>
      <span className="text-[26px] leading-none font-medium tabular-nums text-[var(--text-primary)]">
        {value}
      </span>
      {delta && (
        <span className="meta text-[11px]" style={{ color: deltaColor }}>
          {delta}
        </span>
      )}
      {note && <span className="text-[11px] leading-snug text-[var(--text-muted)]">{note}</span>}
    </div>
  );
}

/** The row a dashboard opens with. */
export function StatRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">{children}</div>;
}
