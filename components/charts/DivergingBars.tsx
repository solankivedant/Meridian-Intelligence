import {
  FALLING_HUE,
  MAX_BAR,
  RISING_HUE,
  barPath,
  percentChange,
} from "./chartUtils";

const W = 720;
const ROW = 34;
const LABEL_W = 116;
const VALUE_W = 56;

export type DivergingRow = {
  label: string;
  /** A rate, where 0.42 is +42%. */
  value: number | null;
  /** Shown in the tooltip — the counts the rate was computed from. */
  detail?: string;
};

/**
 * Change against a zero baseline — quarter-on-quarter coverage, here.
 *
 * Polarity is the job, so this is a diverging form: bars grow left or right
 * from a centre line, with the surface itself as the neutral midpoint. The
 * poles are warm against cool rather than green against red, because a
 * sector's coverage falling is not a bad thing, only a smaller thing, and the
 * status palette would assert otherwise.
 *
 * Every bar is directly labelled. There are only a handful of rows, the values
 * are the entire content, and an axis of percentages would be more ink than
 * the six numbers it exists to spare.
 */
export function DivergingBars({ rows }: { rows: DivergingRow[] }) {
  const drawable = rows.filter((row) => row.value !== null);
  if (drawable.length === 0) return null;

  const height = rows.length * ROW + 12;
  const plotX = LABEL_W;
  const plotW = W - LABEL_W - VALUE_W;
  const mid = plotX + plotW / 2;
  // A symmetric scale, so a +50% and a -50% bar are the same length.
  const extent = Math.max(...drawable.map((row) => Math.abs(row.value as number)), 0.25);

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={rows
          .map((row) => `${row.label} ${percentChange(row.value)}`)
          .join("; ")}
      >
        <line
          x1={mid}
          x2={mid}
          y1={4}
          y2={height - 8}
          stroke="var(--rule-strong)"
          strokeWidth={1}
        />

        {rows.map((row, i) => {
          const y = i * ROW + 6;
          const barY = y + (ROW - MAX_BAR) / 2;
          const value = row.value;
          const rising = (value ?? 0) >= 0;
          const width = value === null ? 0 : (Math.abs(value) / extent) * (plotW / 2);

          return (
            <g key={row.label}>
              <text
                x={LABEL_W - 12}
                y={y + ROW / 2 + 3.5}
                textAnchor="end"
                fontSize={12}
                fill="var(--text-secondary)"
              >
                {row.label}
              </text>

              {value !== null && width > 0 && (
                <path
                  d={
                    rising
                      ? barPath(mid, barY, width, MAX_BAR, "right")
                      : // Mirrored: the rounded end is the data end, which for a
                        // falling bar is its left tip.
                        `M${mid},${barY} H${mid - width + 4} A4,4 0 0 0 ${mid - width},${barY + 4} V${barY + MAX_BAR - 4} A4,4 0 0 0 ${mid - width + 4},${barY + MAX_BAR} H${mid} Z`
                  }
                  fill={rising ? RISING_HUE : FALLING_HUE}
                >
                  <title>{`${row.label}: ${percentChange(value)}${row.detail ? ` (${row.detail})` : ""}`}</title>
                </path>
              )}

              <text
                x={W - 8}
                y={y + ROW / 2 + 3.5}
                textAnchor="end"
                fontSize={12}
                fontWeight={600}
                fill={value === null ? "var(--text-muted)" : "var(--text-primary)"}
                className="meta"
              >
                {percentChange(value)}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
