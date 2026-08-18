import Link from "next/link";
import { Search } from "lucide-react";
import { CATEGORY_META } from "@/lib/categoryMeta";
import { Sidebar } from "./Sidebar";
import { todayDateline } from "@/lib/formatTime";

export function Header() {
  return (
    <header
      className="sticky top-0 z-30 border-b backdrop-blur-md"
      style={{
        borderColor: "var(--rule-strong)",
        backgroundColor: "color-mix(in srgb, var(--paper) 90%, transparent)",
      }}
    >
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

      <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3 sm:px-8">
        <Sidebar />

        <Link href="/" className="min-w-0 shrink">
          <span className="kicker block text-[9px] text-[var(--text-muted)] sm:text-[10px]">
            Daily intelligence briefing
          </span>
          <span className="headline block truncate text-[20px] leading-[1.1] text-[var(--text-primary)] sm:text-[26px]">
            India Policy &amp; Business
          </span>
        </Link>

        {/* The dateline is the one piece of chrome that says "this is today's
            edition", so it is set at reading size rather than as fine print. */}
        <span
          className="ml-auto hidden shrink-0 text-[16px] italic text-[var(--text-secondary)] lg:block"
          style={{ fontFamily: "var(--font-newsreader), Georgia, serif" }}
        >
          {todayDateline()}
        </span>

        <form
          action="/search"
          method="GET"
          className="ml-auto flex shrink-0 items-center gap-1.5 border px-2.5 py-1.5 lg:ml-4"
          style={{ borderColor: "var(--rule-strong)" }}
        >
          <Search className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" aria-hidden />
          <input
            type="search"
            name="q"
            placeholder="Search"
            aria-label="Search the archive"
            className="w-20 min-w-0 bg-transparent text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] sm:w-40"
          />
        </form>
      </div>
    </header>
  );
}
