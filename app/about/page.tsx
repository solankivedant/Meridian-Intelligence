import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Info } from "lucide-react";
import { Section } from "@/components/Section";
import { SectionIcon } from "@/components/MetaIcon";
import { GithubMark, LinkedinMark } from "@/components/BrandMarks";
import { CATEGORY_META } from "@/lib/categoryMeta";
import { TAG_META } from "@/lib/categorize";
import { PERSONAS } from "@/lib/personas";
import { WINDOW_MONTHS } from "@/lib/opportunity";
import { AUTHOR } from "@/lib/author";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "About",
  description: `Meridian is a daily intelligence brief for India, built and managed by ${AUTHOR.name}. What it covers, how it is put together, and what it deliberately does not do.`,
};

/**
 * Who made this and what it actually is.
 *
 * An aggregator asks readers to trust a pipeline they cannot see - what is
 * being pulled, how it is sorted, what is measured versus estimated, and who is
 * accountable for any of it. This page answers all four in one place, which is
 * also the only honest home for the "written by a machine" and "coverage, not
 * returns" caveats that the individual panels only have room to gesture at.
 */
export default function AboutPage() {
  return (
    <div className="flex flex-col gap-8 pt-6">
      <header className="border-b pb-6" style={{ borderColor: "var(--rule-strong)" }}>
        <span className="kicker flex items-center gap-1.5 text-[var(--text-secondary)]">
          <Info className="h-3.5 w-3.5" aria-hidden />
          About
        </span>
        <h1 className="headline mt-2 text-[32px] leading-[1.06] text-[var(--text-primary)] sm:text-[46px]">
          Meridian, and who built it
        </h1>
        <p className="measure mt-3 text-[15px] leading-relaxed text-[var(--text-secondary)]">
          Meridian is a daily intelligence brief for India. It reads what the
          country&rsquo;s ministries, regulators and newsrooms publish, sorts every
          story into {CATEGORY_META.length} sections and {TAG_META.length} sectors,
          and lays the result out as something you read rather than something you
          monitor.
        </p>
      </header>

      <Section
        index="01"
        title="Built &amp; Managed By"
        accentVar="--cat-policy"
      >
        <div className="flex flex-wrap items-center gap-x-8 gap-y-5">
          <Image
            src={AUTHOR.photo}
            alt={AUTHOR.name}
            width={220}
            height={220}
            className="h-36 w-36 shrink-0 rounded-full object-cover sm:h-44 sm:w-44"
            style={{ border: "2px solid var(--rule-strong)" }}
            priority
          />

          <div className="min-w-0">
            <h3 className="headline text-[32px] leading-none text-[var(--text-primary)] sm:text-[40px]">
              {AUTHOR.name}
            </h3>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Profile href={AUTHOR.linkedin} label="LinkedIn">
                <LinkedinMark className="h-4 w-4" />
              </Profile>
              <Profile href={AUTHOR.repo} label="The source on GitHub">
                <GithubMark className="h-4 w-4" />
              </Profile>
            </div>
          </div>
        </div>
      </Section>

      <Section
        index="02"
        title="What the site does"
        accentVar="--cat-tech"
        description="Five layers, in descending order of how much you should trust them."
      >
        <div className="flex flex-col gap-5">
          <Feature
            term="The archive"
            trust="Measured"
            points={[
              "~95 feeds pulled three times a day - PIB, RBI, SEBI, PM India, plus the Economic Times, Business Standard, Mint, BusinessLine, The Hindu and Moneycontrol desks.",
              `A dated archive crawl backfilled ${WINDOW_MONTHS} months of history.`,
              "Wire copy carried by five outlets collapses to one entry - normalised headlines, not just URLs.",
              "Headline, short excerpt and link only. Article text is never stored.",
            ]}
          />

          <Feature
            term="Sections and sectors"
            trust="Rule-based"
            points={[
              `Every story gets one of ${CATEGORY_META.length} sections and any number of ${TAG_META.length} sector tags.`,
              "Keyword rules, not a model - transparent, and wrong in ways you can predict.",
              "The trade is deliberate: it has to run unattended, three times a day, forever.",
            ]}
          />

          <Feature
            term="The sector desk"
            trust="Arithmetic on our own rows"
            points={[
              "Coverage momentum, state support and visible capital, counted from this archive and nothing else.",
              "Momentum is each sector's share of all coverage, never its story count - the archive's own volume grows as it backfills, so measured absolutely every sector would look like it was accelerating.",
              "Attention, not returns. A sector gets louder in trouble as readily as in a boom.",
              "None of it is investment advice.",
            ]}
          />

          <Feature
            term="The wrap and the market primers"
            trust="Machine-written"
            points={[
              "Written by a language model over headlines this archive already holds.",
              "Labelled as estimates wherever they appear.",
              "The one layer that can be confidently wrong - everything above is unaffected if the model is unavailable.",
            ]}
          />

          <Feature
            term="Reader desks"
            trust="A saved reading"
            points={[
              `${PERSONAS.length} desks: citizen, student, founder, business owner, investor, public sector.`,
              "No story is tagged with a desk. Each is a weighted set of sections and sectors over rows that already exist.",
              "So a story that matters to three desks appears on all three.",
            ]}
            href="/for"
            hrefLabel="Open the desks"
          />
        </div>
      </Section>

      <Section
        index="03"
        title="What it covers"
        accentVar="--cat-economy"
        description={`${CATEGORY_META.length} sections, each a page of its own.`}
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORY_META.map((meta) => (
            <Link
              key={meta.slug}
              href={`/category/${meta.slug}`}
              className="flex items-center gap-2 border px-3 py-2 text-[13px] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              style={{ borderColor: "var(--rule)", backgroundColor: "var(--surface-1)" }}
            >
              <SectionIcon meta={meta} size="sm" />
              <span className="min-w-0 truncate">{meta.label}</span>
            </Link>
          ))}
        </div>

        <p className="measure mt-5 text-[13px] leading-relaxed text-[var(--text-muted)]">
          Every figure on the site links back to the stories it was counted from,
          and{" "}
          <Link href="/sources" className="underline underline-offset-2">
            the sources page
          </Link>{" "}
          lists exactly what is being pulled from where.
        </p>
      </Section>
    </div>
  );
}

/**
 * One layer of the stack: what it is, how far to trust it, and the few facts
 * that actually decide that. Set to the full width of the panel rather than to
 * a reading measure - these are points to scan, not prose to read, and a 62ch
 * column of four-word bullets is mostly empty paper.
 */
function Feature({
  term,
  trust,
  points,
  href,
  hrefLabel,
}: {
  term: string;
  trust: string;
  points: string[];
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="border-l-2 pl-4" style={{ borderColor: "var(--rule-strong)" }}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="headline text-[19px] leading-none text-[var(--text-primary)]">{term}</h3>
        <span className="kicker text-[9px] text-[var(--text-muted)]">{trust}</span>
        {href && hrefLabel && (
          <Link
            href={href}
            className="kicker ml-auto text-[9px] text-[var(--text-secondary)] underline underline-offset-4 transition-colors hover:text-[var(--text-primary)]"
          >
            {hrefLabel}
          </Link>
        )}
      </div>
      <ul className="mt-2 flex flex-col gap-1.5">
        {points.map((point) => (
          <li key={point} className="flex gap-2.5 text-[14px] leading-relaxed text-[var(--text-secondary)]">
            <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-[var(--text-muted)]" aria-hidden />
            <span className="min-w-0">{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Profile({
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
