import Link from "next/link";
import Image from "next/image";
import { CATEGORY_META } from "@/lib/categoryMeta";
import { SectionIcon } from "./MetaIcon";
import { GithubMark, LinkedinMark } from "./BrandMarks";
import { AUTHOR } from "@/lib/author";

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
              <SectionIcon meta={meta} size="sm" />
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

      {/*
        The colophon is deliberately not another paragraph in the footer column.
        It is a full-bleed band on its own ground, sitting flush against the
        bottom edge of the page - so it reads as the plate on the back of the
        thing rather than as the last item of content, which is what it was when
        it shared the column with the source disclaimer. Its own surface, its own
        rule, and the page's own max-width applied inside it rather than around.
      */}
      <div
        className="border-t"
        style={{ borderColor: "var(--rule-strong)", backgroundColor: "var(--surface-2)" }}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-4 px-5 py-7 sm:px-8">
          <Image
            src={AUTHOR.photo}
            alt={AUTHOR.name}
            width={132}
            height={132}
            className="h-16 w-16 shrink-0 rounded-full object-cover sm:h-[4.5rem] sm:w-[4.5rem]"
            style={{ border: "2px solid var(--rule-strong)" }}
          />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="kicker text-[10px] text-[var(--text-muted)]">
              Built &amp; Managed By
            </span>
            <span className="headline text-[26px] leading-none text-[var(--text-primary)] sm:text-[32px]">
              {AUTHOR.name}
            </span>
          </span>

          <span className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <ColophonLink href={AUTHOR.linkedin} label="LinkedIn">
              <LinkedinMark className="h-4 w-4" />
            </ColophonLink>
            <ColophonLink href={AUTHOR.repo} label="Source on GitHub">
              <GithubMark className="h-4 w-4" />
            </ColophonLink>
          </span>
        </div>
      </div>
    </footer>
  );
}

/** One outbound link in the colophon. */
function ColophonLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer me"
      className="kicker inline-flex items-center gap-2 border px-3 py-2 text-[10px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--ink-wash)] hover:text-[var(--text-primary)]"
      style={{ borderColor: "var(--rule-strong)", backgroundColor: "var(--surface-1)" }}
    >
      {children}
      {label}
    </a>
  );
}
