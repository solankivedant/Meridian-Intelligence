import Link from "next/link";
import { CategoryMeta } from "@/lib/categoryMeta";

/**
 * The category label above a headline, set as a coloured kicker rather than a
 * filled pill. Pills gave every item the same weight; a kicker sits inside the
 * type hierarchy instead of interrupting it.
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
  const content = (
    <span
      className={`kicker inline-flex items-center gap-1.5 ${size === "xs" ? "text-[10px]" : ""}`}
      style={{ color: `var(${meta.colorVar})` }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: `var(${meta.colorVar})` }}
        aria-hidden
      />
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
