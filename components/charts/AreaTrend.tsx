import type { MonthPoint } from "@/lib/opportunity";
import { MAGNITUDE_HUE, count, monthLabel, monthTick, niceScale } from "./chartUtils";

const W = 720;
const H = 220;
const PAD = { top: 16, right: 46, bottom: 26, left: 38 };

/**
 * Coverage over the window, month by month.
 *
 * One series over time, so: a line, not bars, and one hue rather than the
 * categorical palette - there is nothing here to tell apart. The fill is a
 * 10% wash under the line, which reads as "this area is the same thing as the
 * line" rather than as a second, heavier series.
 *
 * Only the last point is labelled. A number on every month would be twenty-four
 * numbers competing with the shape they describe, and the shape is the point;
 * the rest of the values live on the axis, in the hover tooltips and in the
 * table under the panel.
 */
export function AreaTrend({
  points,
  label,
}: {
  points: MonthPoint[];
  /** What is being counted, for the accessible description. */
  label: string;
}) {
  if (points.length < 2) return null;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const max = Math.max(...points.map((point) => point.count));
  const scale = niceScale(max);

  const x = (i: number) => PAD.left + (i / (points.length - 1)) * plotW;
  const y = (value: number) => PAD.top + plotH - (value / scale.top) * plotH;

  const line = points.map((point, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(point.count)}`).join(" ");
  const area = `${line} L${x(points.length - 1)},${PAD.top + plotH} L${x(0)},${PAD.top + plotH} Z`;

  const last = points[points.length - 1];
  const peak = points.reduce((best, point) => (point.count > best.count ? point : best), points[0]);
  // A year boundary is the only place the axis needs to say which year it is.
  const ticks = points.filter((point, i) => i % 3 === 0 || i === points.length - 1);

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${label} by month. Peak ${count(peak.count)} in ${monthLabel(peak.month)}; ${count(last.count)} in ${monthLabel(last.month)}.`}
      >
        {scale.values.map((value) => (
          <g key={value}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(value)}
              y2={y(value)}
              stroke="var(--rule)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y(value) + 3.5}
              textAnchor="end"
              className="meta"
              fill="var(--text-muted)"
              fontSize={10}
            >
              {count(value)}
            </text>
          </g>
        ))}

        <path d={area} fill={MAGNITUDE_HUE} opacity={0.1} />
        <path
          d={line}
          fill="none"
          stroke={MAGNITUDE_HUE}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* The end marker carries a 2px ring in the surface colour so it stays
            legible where it sits on the line it terminates. */}
        <circle
          cx={x(points.length - 1)}
          cy={y(last.count)}
          r={4}
          fill={MAGNITUDE_HUE}
          stroke="var(--surface-1)"
          strokeWidth={2}
        />
        <text
          x={x(points.length - 1) + 9}
          y={y(last.count) + 3.5}
          className="meta"
          fill="var(--text-primary)"
          fontSize={11}
          fontWeight={600}
        >
          {count(last.count)}
        </text>

        {ticks.map((point) => (
          <text
            key={point.month}
            x={x(points.indexOf(point))}
            y={H - 8}
            textAnchor="middle"
            className="meta"
            fill="var(--text-muted)"
            fontSize={10}
          >
            {monthTick(point.month, point.month.endsWith("-01") || point === ticks[0])}
          </text>
        ))}

        {/* Invisible hit bands, one per month, so every point has a tooltip
            without shipping a kilobyte of JavaScript for a crosshair. */}
        {points.map((point, i) => (
          <rect
            key={point.month}
            x={x(i) - plotW / (points.length - 1) / 2}
            y={PAD.top}
            width={plotW / (points.length - 1)}
            height={plotH}
            fill="transparent"
          >
            <title>{`${monthLabel(point.month)}: ${count(point.count)} stories`}</title>
          </rect>
        ))}
      </svg>
    </figure>
  );
}
