import Link from "next/link";
import { CategoryMeta } from "@/lib/categoryMeta";

/**
 * The category label above a headline, set as a coloured kicker rather than a
 * filled pill. Pills gave every item the same weight; a kicker sits inside the
 * type hierarchy instead of interrupting it.
 *
 * The section's own glyph leads it. A coloured dot said only "this differs from
 * that one", which asks the reader to have memorised eight hues; the icon says
 * which section it is at a glance, and still carries the hue.
 */
export function CategoryBadge({
  meta,
  href,
  size = "sm",
}: {
  meta: CategoryMeta;
  href?: string;
  size?: "sm" | "xs";
}) {
  const Icon = meta.icon;
  const content = (
    <span
      className={`kicker inline-flex items-center gap-1.5 ${size === "xs" ? "text-[10px]" : ""}`}
      style={{ color: `var(${meta.colorVar})` }}
    >
      <Icon className={size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />
      {meta.shortLabel}
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} className="inline-flex transition-opacity hover:opacity-70">
      {content}
    </Link>
  );
}
