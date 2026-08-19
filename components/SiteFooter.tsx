import Link from "next/link";
import { CATEGORY_META } from "@/lib/categoryMeta";

export function SiteFooter() {
  return (
    <footer className="border-t" style={{ borderColor: "var(--rule)" }}>
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-8 sm:px-8">
        {/* The masthead has room for one line above the name, and "daily
            intelligence briefing" is the one that earns it - it tells a reader
            what kind of thing they are looking at. What the paper actually
            covers belongs here, at the foot, where a reader who has scrolled
            the whole page is the one asking. */}
        <div
          className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b pb-4"
          style={{ borderColor: "var(--rule)" }}
        >
          <span className="headline text-[22px] leading-none text-[var(--text-primary)]">
            Meridian
          </span>
          <span className="kicker text-[10px] text-[var(--text-muted)]">
            Policy, business &amp; markets
          </span>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Link
            href="/world"
            className="text-[13px] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            World desk
          </Link>
          <Link
            href="/opportunities"
            className="text-[13px] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            Sector opportunities
          </Link>
          {CATEGORY_META.map((meta) => (
            <Link
              key={meta.slug}
              href={`/category/${meta.slug}`}
              className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: `var(${meta.colorVar})` }}
                aria-hidden
              />
              {meta.label}
            </Link>
          ))}
        </div>
        <p className="measure text-xs leading-relaxed text-[var(--text-muted)]">
          Headlines, short excerpts, and links are aggregated from public feeds
          published by Indian ministries, regulators, and newsrooms. Full article
          text is never stored - every item links back to its publisher.{" "}
          <Link href="/sources" className="underline underline-offset-2">
            See all sources
          </Link>
          .
        </p>
      </div>
    </footer>
  );
}
