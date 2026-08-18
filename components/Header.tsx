import Link from "next/link";
import { CATEGORY_META } from "@/lib/categoryMeta";
import { Sidebar } from "./Sidebar";
import { PrimaryNav } from "./PrimaryNav";
import { SectionJump } from "./SectionJump";
import { SearchBox } from "./SearchBox";
import { PrefsMenu } from "./PrefsMenu";
import { ReadingProgress } from "./ReadingProgress";
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

        {/* Search takes the centre of the masthead at full width. Cornered into
            a 40px stub it read as an afterthought; here it is the second thing
            the eye lands on, which matches how often readers arrive wanting one
            specific story rather than the day's feed. */}
        <div className="hidden min-w-0 flex-1 justify-center lg:flex">
          <div className="w-full max-w-xl">
            <SearchBox />
          </div>
        </div>

        {/* The dateline is the one piece of chrome that says "this is today's
            edition", so it is set at reading size — upright, not italic, which
            at this size stays legible instead of turning into ornament. */}
        <div className="ml-auto flex shrink-0 items-center gap-3">
          <span
            className="hidden text-[17px] leading-tight font-medium text-[var(--text-secondary)] lg:block xl:text-[20px]"
            style={{ fontFamily: "var(--font-newsreader), Georgia, serif" }}
          >
            {todayDateline()}
          </span>
          <PrefsMenu />
        </div>
      </div>

      {/* Between the masthead's breakpoint and a phone the field gets its own
          full-width row. On a phone it would cost a third of a sticky header,
          so there it stays where it already was — inside the drawer. */}
      <div className="mx-auto hidden max-w-6xl px-5 pb-3 sm:block sm:px-8 lg:hidden">
        <SearchBox />
      </div>

      <div className="border-t" style={{ borderColor: "var(--rule)" }}>
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-3 sm:px-6">
          <PrimaryNav />
          <div className="ml-auto hidden shrink-0 py-1.5 md:block">
            <SectionJump />
          </div>
        </div>
      </div>

      {/* Sits on the masthead's own bottom edge, so progress finishes a rule
          that is already there instead of floating over the page. */}
      <ReadingProgress />
    </header>
  );
}
