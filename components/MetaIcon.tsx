import type { CategoryMeta } from "@/lib/categoryMeta";
import { metaForSector } from "@/lib/sectorMeta";

const SIZES = {
  xs: "h-3 w-3",
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
} as const;

export type GlyphSize = keyof typeof SIZES;

/**
 * The mark that identifies a section or a sector wherever one is named.
 *
 * Both scales previously showed as a coloured dot, which tells a reader that
 * two things differ but never which is which - eight identical circles in
 * eight colours is a legend you have to have memorised. The glyph carries the
 * same hue *and* says what it is, so a chip, a table row and a feed header can
 * all be recognised before they are read.
 */
export function SectionIcon({
  meta,
  size = "sm",
  className = "",
}: {
  meta: CategoryMeta;
  size?: GlyphSize;
  className?: string;
}) {
  const Icon = meta.icon;
  return (
    <Icon
      className={`${SIZES[size]} shrink-0 ${className}`}
      style={{ color: `var(${meta.colorVar})` }}
      aria-hidden
    />
  );
}

export function SectorIcon({
  sector,
  size = "sm",
  className = "",
}: {
  /** Sector tag key, e.g. `semiconductors`. */
  sector: string;
  size?: GlyphSize;
  className?: string;
}) {
  const meta = metaForSector(sector);
  const Icon = meta.icon;
  return (
    <Icon
      className={`${SIZES[size]} shrink-0 ${className}`}
      style={{ color: `var(${meta.colorVar})` }}
      aria-hidden
    />
  );
}

/**
 * A glyph on a wash of its own colour - the badge form, for the places where
 * an icon has to hold its own against a headline rather than sit beside a
 * label: a section board's header, a sector's page, an expanded row.
 */
export function GlyphTile({
  icon: Icon,
  colorVar,
  size = "md",
  className = "",
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties; "aria-hidden"?: boolean }>;
  colorVar: string;
  size?: GlyphSize;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${
        size === "lg" ? "h-9 w-9" : size === "md" ? "h-7 w-7" : "h-6 w-6"
      } ${className}`}
      style={{
        color: `var(${colorVar})`,
        backgroundColor: `color-mix(in srgb, var(${colorVar}) 13%, transparent)`,
      }}
    >
      <Icon className={SIZES[size]} aria-hidden />
    </span>
  );
}
