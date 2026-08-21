import type { Metadata } from "next";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { Region } from "@/lib/enums";
import { safeQuery } from "@/lib/safeQuery";
import { Section } from "@/components/Section";
import { StatRow, StatTile } from "@/components/StatTile";
import { CompanyTable } from "@/components/CompanyTable";
import { count, percentChange } from "@/components/charts/chartUtils";
import {
  WINDOW_MONTHS,
  getCompanySignals,
  isCompanySort,
  sortCompanies,
  type CompanySort,
} from "@/lib/company";
import { COMPANIES, companyGroups } from "@/lib/entities";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Companies",
  description:
    "Which Indian companies the policy and business archive actually names - coverage, momentum and a timeline for each of about three hundred listed and private businesses.",
};

/** Rows drawn before the table starts reporting a remainder instead. */
const VISIBLE_ROWS = 80;

/**
 * The company directory.
 *
 * The archive has always known which companies its stories name; it just had
 * nowhere to say so. This page is the index into that, and the figure it leads
 * with is deliberately the least flattering one: how much of the archive can
 * be attributed to a named company at all. A dictionary of three hundred names
 * over an archive of tens of thousands of stories reaches a minority of them,
 * and a directory that hid that behind a big number would be lying about its
 * own coverage.
 */
export default async function CompanyDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ by?: string }>;
}) {
  const params = await searchParams;
  const sort: CompanySort = isCompanySort(params.by) ? params.by : "coverage";

  const signals = await safeQuery(() => getCompanySignals(Region.INDIA), []);

  const covered = signals.filter((signal) => signal.total > 0);
  const attributed = signals.reduce((total, signal) => total + signal.total, 0);
  const rated = signals.filter((signal) => signal.momentum !== null);
  const fastest = sortCompanies(rated, "momentum")[0];
  const busiest = sortCompanies(covered, "recent")[0];
  const groups = companyGroups();

  return (
    <div className="flex flex-col gap-8 pt-6">
      <header className="border-b pb-6" style={{ borderColor: "var(--rule-strong)" }}>
        <span className="kicker flex items-center gap-1.5 text-[var(--cat-business)]">
          <Building2 className="h-3.5 w-3.5" aria-hidden />
          Market desk
        </span>
        <h1 className="headline mt-2 text-[32px] leading-[1.06] text-[var(--text-primary)] sm:text-[46px]">
          Who the archive is writing about
        </h1>
        <p className="measure mt-3 text-[15px] leading-relaxed text-[var(--text-secondary)]">
          Every story is checked against a dictionary of {count(COMPANIES.length)}{" "}
          Indian companies - the index constituents, the PSUs whose
          announcements are policy events in themselves, and the large private
          and newly-listed businesses this archive covers heavily. Open a name
          for its own timeline.
        </p>
        <p
          className="measure mt-3 border-l-2 pl-3 text-[13px] leading-relaxed text-[var(--text-muted)]"
          style={{ borderColor: "var(--cat-geopolitics)" }}
        >
          These are counts of <strong>coverage</strong>, not of performance. A
          company gets written about when it is in trouble at least as readily
          as when it is doing well, there are no prices anywhere on this page,
          and none of it is investment advice.
        </p>
      </header>

      <Section
        index="01"
        title="The directory"
        accentVar="--cat-business"
        note={`${WINDOW_MONTHS} months`}
        description="Every company the archive named in the window, and how each is trending."
      >
        <div className="flex flex-col gap-8">
          <StatRow>
            <StatTile
              label="Companies named"
              value={`${count(covered.length)} of ${count(signals.length)}`}
              note="In the dictionary, and in the news"
            />
            <StatTile
              label="Stories attributed"
              value={count(attributed)}
              note="A story naming three companies counts once for each"
            />
            {busiest && (
              <StatTile
                label="Most covered"
                value={busiest.company.name}
                note={`${count(busiest.recent)} stories in the last 90 days`}
              />
            )}
            {fastest && (
              <StatTile
                label="Fastest mover"
                value={fastest.company.name}
                delta={percentChange(fastest.momentum)}
                deltaTone={(fastest.momentum ?? 0) >= 0 ? "up" : "down"}
                note="Biggest share gain this quarter"
              />
            )}
            <StatTile
              label="Rated for momentum"
              value={count(rated.length)}
              note="Enough prior coverage to compare quarters"
            />
            <StatTile
              label="Promoter groups"
              value={count(groups.length)}
              note="Where the group is itself a story"
            />
          </StatRow>

          {signals.length === 0 || covered.length === 0 ? (
            <p className="text-[15px] leading-relaxed text-[var(--text-muted)]">
              No company coverage yet. The column is filled by ingestion going
              forward, and for the existing archive by{" "}
              <code className="meta text-[12px]">npm run entities -- --apply</code>.
            </p>
          ) : (
            <CompanyTable
              signals={signals}
              sort={sort}
              limit={VISIBLE_ROWS}
              hrefFor={(key) => (key === "coverage" ? "/company" : `/company?by=${key}`)}
            />
          )}
        </div>
      </Section>

      {groups.length > 0 && (
        <Section
          index="02"
          title="By promoter group"
          accentVar="--cat-business"
          description="Where several listed companies share an owner, and the group's news is the story."
        >
          <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map(({ group, companies }) => (
              <div key={group}>
                <p className="kicker text-[10px] text-[var(--text-primary)]">
                  {group}
                  <span className="meta ml-2 text-[10px]">{companies.length}</span>
                </p>
                <ul className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1">
                  {companies.map((company) => (
                    <li key={company.key}>
                      <Link
                        href={`/company/${company.key}`}
                        className="text-[13px] text-[var(--text-secondary)] underline-offset-2 hover:text-[var(--text-primary)] hover:underline"
                      >
                        {company.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section
        index="03"
        title="How to read this"
        accentVar="--cat-business"
        description="What the columns count, and where the dictionary stops."
      >
        <dl className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
          <Definition term="Stories">
            Everything in the last {WINDOW_MONTHS} months whose headline or
            excerpt named this company in a form the dictionary recognises. One
            story can name several companies and counts once for each, so the
            column does not sum to the archive.
          </Definition>
          <Definition term="Momentum">
            The change in a company&rsquo;s <strong>share of all coverage</strong>,
            last 90 days against the 90 before. A share rather than a count for
            the same reason as the sector desk: this archive was backfilled and
            is still filling, so measured in absolute terms every name in it
            would look like it was accelerating. Companies with fewer than six
            stories in the prior quarter are left unrated rather than handed a
            rate that a handful of stories cannot support.
          </Definition>
          <Definition term="Ticker or private">
            The exchange symbol where there is one. A great deal of what this
            archive covers - the large consumer-internet companies, the space
            startups, the state telecom operator - is not listed at all, and
            those names are marked rather than left blank.
          </Definition>
          <Definition term="What is missing">
            The dictionary is curated for precision, so it is not exhaustive:
            small caps that the ingested feeds almost never name are absent by
            design, and a story that describes a company without naming it will
            not appear on its page. Adding a name is one line in{" "}
            <code className="meta text-[12px]">lib/entities.ts</code>.
          </Definition>
        </dl>
      </Section>
    </div>
  );
}

function Definition({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="kicker text-[10px] text-[var(--text-primary)]">{term}</dt>
      <dd className="measure mt-1 text-[13.5px] leading-relaxed text-[var(--text-secondary)]">
        {children}
      </dd>
    </div>
  );
}
