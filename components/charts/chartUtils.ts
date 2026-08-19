/**
 * The small amount of geometry and arithmetic every chart on the
 * opportunities desk shares.
 *
 * There is no chart library here. The charts are four fixed shapes over data
 * this app already holds, they render on the server, and a dependency would
 * cost more kilobytes than the entire page — but the reason to keep them by
 * hand is the specs: a chart library's defaults are dashed gridlines, a
 * saturated area fill and a value on every point, and undoing those is more
 * work than drawing the marks.
 */

/** Bars are capped rather than filling their slot — the leftover band is air. */
export const MAX_BAR = 24;
/** The rounded data-end. The baseline end stays square. */
export const END_RADIUS = 4;
/** Every touching mark is separated by this much surface, never by a stroke. */
export const SURFACE_GAP = 2;

/**
 * A bar with one rounded end.
 *
 * `rx` on a `<rect>` rounds all four corners, which detaches the mark from its
 * baseline and makes a zero-length bar draw as a lozenge. The data-end is the
 * only end that gets a radius.
 */
export function barPath(
  x: number,
  y: number,
  width: number,
  height: number,
  direction: "up" | "down" | "right"
): string {
  const r = Math.max(
    0,
    Math.min(END_RADIUS, direction === "right" ? width / 2 : height / 2)
  );

  if (direction === "right") {
    const end = x + width;
    return `M${x},${y} H${end - r} A${r},${r} 0 0 1 ${end},${y + r} V${y + height - r} A${r},${r} 0 0 1 ${end - r},${y + height} H${x} Z`;
  }
  if (direction === "up") {
    const top = y;
    const base = y + height;
    return `M${x},${base} V${top + r} A${r},${r} 0 0 1 ${x + r},${top} H${x + width - r} A${r},${r} 0 0 1 ${x + width},${top + r} V${base} Z`;
  }
  const base = y;
  const bottom = y + height;
  return `M${x},${base} V${bottom - r} A${r},${r} 0 0 0 ${x + r},${bottom} H${x + width - r} A${r},${r} 0 0 0 ${x + width},${bottom - r} V${base} Z`;
}

/**
 * Axis ticks a reader can hold in their head: 0, 250, 500 rather than 0, 237,
 * 474. The top of the scale is rounded up so the tallest mark sits inside it.
 */
export function niceScale(max: number, ticks = 3): { top: number; values: number[] } {
  if (max <= 0) return { top: 1, values: [0, 1] };
  const rough = max / (ticks - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((candidate) => candidate >= rough) ??
    10 * magnitude;
  const top = Math.ceil(max / step) * step;
  const values: number[] = [];
  for (let value = 0; value <= top + 1e-9; value += step) values.push(Math.round(value));
  return { top, values };
}

/** `2026-08` to `Aug` — and to `Aug 26` when a year boundary needs marking. */
export function monthTick(key: string, withYear = false): string {
  const [year, month] = key.split("-");
  const name = new Date(Date.UTC(Number(year), Number(month) - 1, 1)).toLocaleDateString(
    "en-IN",
    { month: "short", timeZone: "UTC" }
  );
  return withYear ? `${name} ${year.slice(2)}` : name;
}

export function monthLabel(key: string): string {
  const [year, month] = key.split("-");
  return new Date(Date.UTC(Number(year), Number(month) - 1, 1)).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function count(value: number): string {
  return value.toLocaleString("en-IN");
}

/** A rate as a signed percentage: `+42%`, `-8%`, `—` when there is nothing to compare. */
export function percentChange(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 100);
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/**
 * The single hue every magnitude chart uses.
 *
 * Volume and rank are not identity, so they do not get the categorical
 * palette: one series, one colour, and the length of the mark carries the
 * value. Colouring twenty-five publishers twenty-five ways would burn the only
 * free channel on information the bars already show.
 */
export const MAGNITUDE_HUE = "var(--cat-policy)";

/**
 * The diverging pair, for anything measured against a zero baseline.
 *
 * Warm against cool, with the surface itself as the neutral midpoint. Green
 * and red are deliberately avoided: they would read as good and bad, and a
 * sector whose coverage is falling is not thereby a worse sector.
 */
export const RISING_HUE = "var(--cat-policy)";
export const FALLING_HUE = "var(--cat-subsidy)";
