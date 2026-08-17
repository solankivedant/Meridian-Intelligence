import Link from "next/link";
import { CATEGORY_META } from "@/lib/categoryMeta";
import { CategoryNav } from "./CategoryNav";
import { todayDateline } from "@/lib/formatTime";

export function Header() {
  return (
    <header>
      {/* Eight equal segments, one per category, in palette order — a colour
          legend for the dots used throughout the page rather than decoration. */}
      <div className="flex h-[3px] w-full" aria-hidden>
        {CATEGORY_META.map((meta) => (
          <span
            key={meta.slug}
            className="flex-1"
            style={{ backgroundColor: `var(${meta.colorVar})` }}
          />
        ))}
      </div>

      <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-x-6 gap-y-3 px-5 pb-4 pt-5 sm:px-8">
        <Link href="/" className="group block">
          <span
            className="kicker block"
            style={{ color: "var(--text-muted)" }}
          >
            Daily intelligence briefing
          </span>
          <span className="headline mt-1 block text-[26px] leading-[1.05] text-[var(--text-primary)] sm:text-[34px]">
            India Policy &amp; Business
          </span>
        </Link>

        <div className="flex items-center gap-4 pb-1">
          <span className="meta hidden sm:inline">{todayDateline()}</span>
          <Link
            href="/sources"
            className="kicker border-b pb-0.5 transition-colors"
            style={{ borderColor: "var(--rule-strong)", color: "var(--text-secondary)" }}
          >
            Sources
          </Link>
        </div>
      </div>

      <CategoryNav />
    </header>
  );
}
