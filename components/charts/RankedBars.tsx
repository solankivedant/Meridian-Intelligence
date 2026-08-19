import { MAGNITUDE_HUE, MAX_BAR, barPath, count } from "./chartUtils";

const W = 720;
const ROW = 30;
const LABEL_W = 210;
const VALUE_W = 52;

/**
 * A ranked comparison of nominal things — publishers, here.
 *
 * Every bar is the same colour. Publishers have no natural order, so colouring
 * them individually would be identity nobody asked for; shading them darker
 * where they are longer would double-encode the length the bar already shows.
 * One hue, one meaning: the bar's length is the count.
 *
 * Horizontal because the labels are names, and names set sideways under a
 * column chart are the single most common way a chart becomes unreadable.
 */
export function RankedBars({
  rows,
  unit = "stories",
}: {
  rows: { label: string; value: number }[];
  unit?: string;
}) {
  if (rows.length === 0) return null;

  const height = rows.length * ROW + 8;
  const plotW = W - LABEL_W - VALUE_W;
  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={rows.map((row) => `${row.label} ${count(row.value)}`).join("; ")}
      >
        {rows.map((row, i) => {
          const y = i * ROW + 4;
          const width = (row.value / max) * plotW;

          return (
            <g key={row.label}>
              <text
                x={LABEL_W - 12}
                y={y + ROW / 2 + 3.5}
                textAnchor="end"
                fontSize={12}
                fill="var(--text-secondary)"
              >
                {/* Long mastheads are truncated here rather than allowed to run
                    under the bars; the full name is in the tooltip. */}
                {row.label.length > 30 ? `${row.label.slice(0, 29)}…` : row.label}
                <title>{row.label}</title>
              </text>

              <path
                d={barPath(LABEL_W, y + (ROW - MAX_BAR) / 2, Math.max(width, 2), MAX_BAR, "right")}
                fill={MAGNITUDE_HUE}
              >
                <title>{`${row.label}: ${count(row.value)} ${unit}`}</title>
              </path>

              <text
                x={LABEL_W + width + 8}
                y={y + ROW / 2 + 3.5}
                fontSize={12}
                fontWeight={600}
                fill="var(--text-primary)"
                className="meta"
              >
                {count(row.value)}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
