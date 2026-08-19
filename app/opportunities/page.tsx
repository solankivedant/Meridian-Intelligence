import type { Metadata } from "next";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { Region } from "@/lib/enums";
import { safeQuery } from "@/lib/safeQuery";
import { Section } from "@/components/Section";
import { StatRow, StatTile } from "@/components/StatTile";
import {
  SectorTable,
  isSectorSort,
  sortSectors,
  type SectorSort,
} from "@/components/SectorTable";
import { count, percentChange } from "@/components/charts/chartUtils";
import { WINDOW_MONTHS, getSectorSignals } from "@/lib/opportunity";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Opportunities",
  description:
    "Which Indian sectors the policy and business archive is getting louder about - coverage momentum, state support and visible capital across 25 sectors.",
};

/**
 * The opportunities desk.
 *
 * Everything ranked here is measured off this archive: how much has been
 * published about each sector, whether that is accelerating, how much of it is
 * the state acting, and how much is money visibly moving. That is a real and
 * genuinely useful signal - policy attention reliably precedes capital in
 * India - and it is emphatically not a valuation. The page says so at the top
 * rather than in a footnote, because a table sorted by "opportunity" invites
 * exactly the wrong reading if it doesn't.
 */
export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ by?: string }>;
}) {
  const params = await searchParams;
  const sort: SectorSort = isSectorSort(params.by) ? params.by : "score";

  const signals = await safeQuery(() => getSectorSignals(Region.INDIA), []);
  const ranked = sortSectors(signals, sort);

  const tracked = signals.filter((signal) => signal.total > 0);
  const stories = signals.reduce((total, signal) => total + signal.total, 0);
  const rated = signals.filter((signal) => signal.momentum !== null);
  const rising = rated.filter((signal) => (signal.momentum ?? 0) > 0.1);
  const fastest = sortSectors(rated, "momentum")[0];

  return (
    <div className="flex flex-col gap-8 pt-6">
      <header className="border-b pb-6" style={{ borderColor: "var(--rule-strong)" }}>
        <span className="kicker flex items-center gap-1.5 text-[var(--cat-investment)]">
          <TrendingUp className="h-3.5 w-3.5" aria-hidden />
          Sector desk
        </span>
        <h1 className="headline mt-2 text-[32px] leading-[1.06] text-[var(--text-primary)] sm:text-[46px]">
          Where the money is going
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--text-secondary)]">
          25 sectors, ranked by what {WINDOW_MONTHS} months of Indian policy
          and business coverage actually shows: how loud each has become, whether
          that is accelerating, how much of it is the state acting, and how much is
          capital moving. Open a sector for its full dashboard.
        </p>
        <p
          className="mt-3 border-l-2 pl-3 text-[13px] leading-relaxed text-[var(--text-muted)]"
          style={{ borderColor: "var(--cat-geopolitics)" }}
        >
          These are measures of <strong>coverage</strong>, not of returns. A sector
          gets louder when it is in trouble as readily as when it is booming, and
          nothing on this desk is investment advice - it is a research starting
          point, and every figure links back to the stories it was counted from.
        </p>
      </header>

      <Section
        index="01"
        title="The board"
        accentVar="--cat-investment"
        note={`${WINDOW_MONTHS} months`}
        description="Coverage across every tracked sector, and how each is trending."
      >
        <div className="flex flex-col gap-8">
          <StatRow>
            <StatTile label="Sectors tracked" value={count(tracked.length)} note="With coverage in the window" />
            <StatTile label="Stories analysed" value={count(stories)} note="Sector-tagged, India desk" />
            <StatTile
              label="Gaining ground"
              value={`${count(rising.length)} of ${count(rated.length)}`}
              note="Share of coverage up more than 10% this quarter"
              deltaTone="up"
            />
            {fastest && (
              <StatTile
                label="Fastest mover"
                value={fastest.label}
                delta={percentChange(fastest.momentum)}
                deltaTone={(fastest.momentum ?? 0) >= 0 ? "up" : "down"}
                note="Biggest share gain this quarter"
              />
            )}
            <StatTile
              label="Window"
              value={`${WINDOW_MONTHS}m`}
              note="How far back the archive reaches"
            />
            <StatTile
              label="Momentum basis"
              value="90d"
              note="Share of coverage, against the previous quarter"
            />
          </StatRow>

          {signals.length === 0 ? (
            <p className="text-[15px] text-[var(--text-muted)]">
              No sector coverage yet - run an ingest to populate the archive.
            </p>
          ) : (
            <SectorTable
              signals={signals}
              sort={sort}
              hrefFor={(key) => (key === "score" ? "/opportunities" : `/opportunities?by=${key}`)}
            />
          )}
        </div>
      </Section>

      <Section
        index="02"
        title="How to read this"
        accentVar="--cat-investment"
        description="What each column is actually counting."
      >
        <dl className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
          <Definition term="Stories">
            Everything the archive holds against that sector tag in the last{" "}
            {WINDOW_MONTHS} months. A story can carry several sector tags, so the
            columns do not sum to the archive.
          </Definition>
          <Definition term="Shape">
            Monthly coverage across the window, each sector drawn against its own
            peak - the line is for shape, not height. The totals column ranks size.
          </Definition>
          <Definition term="Momentum">
            The change in a sector&rsquo;s <strong>share of all coverage</strong>,
            last 90 days against the 90 before. Share rather than raw story count
            for a specific reason: this archive was backfilled and is still being
            filled, so its own volume climbs month on month and, counted in
            absolute terms, every sector would look like it was accelerating. A
            share rises only when a sector gains ground on everything else being
            published. Quarters rather than months, because policy news is seasonal
            - a Budget lands in February and skews any monthly comparison around
            it. Sectors with fewer than twelve stories in the prior quarter are
            left unrated rather than handed a rate that a handful of stories cannot
            support.
          </Definition>
          <Definition term="State">
            The share of a sector&rsquo;s coverage that is policy, regulation or
            subsidy news. High means the sector moves when the government moves.
          </Definition>
          <Definition term="Capital">
            The share that is investment or FDI news - money visibly being
            committed, rather than announced intent.
          </Definition>
          <Definition term="Opportunity">
            The default ranking: momentum, scaled by how much coverage there is,
            weighted up by state support and by capital. It is a sort order and
            nothing more - sectors under twenty stories are excluded so a small
            base cannot manufacture a big swing.
          </Definition>
        </dl>

        <p className="measure mt-5 text-[13px] leading-relaxed text-[var(--text-muted)]">
          Each sector&rsquo;s own page adds the market-side figures a reader needs
          next - size, growth rate, the ratios that matter for that industry, and
          the routes into it. Those are written by a language model and labelled as
          estimates, because this archive cannot measure them.{" "}
          <Link href="/sources" className="underline underline-offset-2">
            See where the stories come from
          </Link>
          .
        </p>
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
