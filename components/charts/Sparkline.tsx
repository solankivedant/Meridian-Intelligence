import type { MonthPoint } from "@/lib/opportunity";
import { MAGNITUDE_HUE, count, monthLabel } from "./chartUtils";

/**
 * The shape of a sector's coverage, small enough to sit in a table row.
 *
 * A sparkline is deliberately axis-free: it answers "what shape is this" and
 * nothing else, and the row it sits in carries the numbers. Every sparkline in
 * a column is drawn against **its own** maximum, because the comparison the
 * column invites is of shape, not height - the totals column already ranks
 * magnitude, and a shared scale would flatten twenty of the twenty-five rows
 * into a straight line.
 */
export function Sparkline({
  points,
  width = 96,
  height = 26,
}: {
  points: MonthPoint[];
  width?: number;
  height?: number;
}) {
  if (points.length < 2) return null;

  const max = Math.max(...points.map((point) => point.count), 1);
  const step = width / (points.length - 1);
  const y = (value: number) => height - 2 - (value / max) * (height - 4);

  const line = points.map((point, i) => `${i === 0 ? "M" : "L"}${i * step},${y(point.count)}`).join(" ");
  const last = points[points.length - 1];
  const peak = points.reduce((best, point) => (point.count > best.count ? point : best), points[0]);

  return (
    <svg
      viewBox={`0 0 ${width + 6} ${height}`}
      width={width + 6}
      height={height}
      className="shrink-0 overflow-visible"
      role="img"
      aria-label={`Monthly coverage, peaking at ${count(peak.count)} in ${monthLabel(peak.month)}`}
    >
      <path
        d={`${line} L${width},${height} L0,${height} Z`}
        fill={MAGNITUDE_HUE}
        opacity={0.1}
      />
      <path d={line} fill="none" stroke={MAGNITUDE_HUE} strokeWidth={1.5} strokeLinejoin="round" />
      <circle
        cx={width}
        cy={y(last.count)}
        r={2.5}
        fill={MAGNITUDE_HUE}
        stroke="var(--surface-1)"
        strokeWidth={1.5}
      />
    </svg>
  );
}
