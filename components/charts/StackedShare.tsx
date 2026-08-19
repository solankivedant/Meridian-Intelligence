import { Category } from "@/lib/enums";
import { metaForCategory } from "@/lib/categoryMeta";
import { SURFACE_GAP, count, percent } from "./chartUtils";

const W = 720;
const H = 34;

/**
 * How a sector's coverage splits across the eight sections.
 *
 * Part-to-whole with identity as the job, so this is the one chart on the desk
 * that uses the categorical palette — and it uses the site's existing fixed
 * assignment, so a section is the same colour here as it is in the pulse, the
 * drawer and every card's left edge. Horizontal because the section names are
 * long.
 *
 * The segments are separated by 2px of surface rather than by a stroke, and a
 * legend is always drawn: eight hues is the token ceiling, two of them are a
 * yellow and an orange, and no reader should have to distinguish them by colour
 * alone. Inline labels are measured before they are placed — a label that would
 * not fit is dropped rather than clipped, and its value is still in the legend.
 */
export function StackedShare({
  parts,
  total,
}: {
  parts: { category: Category; count: number }[];
  total: number;
}) {
  if (total <= 0 || parts.length === 0) return null;

  // Palette order, not descending count: the reader already knows this order
  // from every other panel on the site, and re-sorting by size would make two
  // sectors' charts incomparable.
  const ordered = parts
    .slice()
    .sort(
      (a, b) =>
        CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
    )
    .filter((part) => part.count > 0);

  let cursor = 0;

  return (
    <figure className="m-0 flex flex-col gap-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Coverage split across ${ordered.length} sections of ${count(total)} stories.`}
      >
        {ordered.map((part) => {
          const width = (part.count / total) * W;
          const x = cursor;
          cursor += width;

          const meta = metaForCategory(part.category);
          const share = part.count / total;
          const text = percent(share);
          // ~6px per character at 10px, plus 12px of breathing room either side.
          const fits = width > text.length * 6 + 16;

          return (
            <g key={part.category}>
              <rect
                x={x}
                y={0}
                width={Math.max(0, width - SURFACE_GAP)}
                height={H}
                fill={`var(${meta.colorVar})`}
              >
                <title>{`${meta.label}: ${count(part.count)} stories, ${text}`}</title>
              </rect>
              {fits && (
                // Set on the fill, so it takes the one colour guaranteed to
                // clear contrast against every hue in the palette.
                <text
                  x={x + (width - SURFACE_GAP) / 2}
                  y={H / 2 + 3.5}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={600}
                  fill="#ffffff"
                  className="meta"
                >
                  {text}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <figcaption className="flex flex-wrap gap-x-4 gap-y-1.5">
        {ordered.map((part) => {
          const meta = metaForCategory(part.category);
          return (
            <span key={part.category} className="flex items-center gap-1.5 text-[12px]">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: `var(${meta.colorVar})` }}
                aria-hidden
              />
              <span className="text-[var(--text-secondary)]">{meta.shortLabel}</span>
              <span className="meta">{count(part.count)}</span>
            </span>
          );
        })}
      </figcaption>
    </figure>
  );
}

const CATEGORY_ORDER: Category[] = [
  Category.POLICY_REGULATORY,
  Category.SUBSIDY_SCHEME,
  Category.BUSINESS_STARTUP,
  Category.TECH_INNOVATION,
  Category.ECONOMY_MARKETS,
  Category.INVESTMENT_FDI,
  Category.TRADE_IMPORT_EXPORT,
  Category.GEOPOLITICS,
];
