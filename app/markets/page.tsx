import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  CalendarDays,
  CandlestickChart,
  Gavel,
  type LucideIcon,
} from "lucide-react";
import { Region } from "@/lib/enums";
import { safeQuery } from "@/lib/safeQuery";
import { Section } from "@/components/Section";
import { StatRow, StatTile } from "@/components/StatTile";
import { count } from "@/components/charts/chartUtils";
import { MarketSectorList, type MarketSectorRow } from "@/components/MarketSectorList";
import { allBridges, bridgeCoverage } from "@/lib/instruments";
import { getCompanySignals } from "@/lib/company";
import { COMPANIES, companiesInSector } from "@/lib/entities";
import { ISSUANCE_MONTHS, getIssuanceEvents, summariseIssuance } from "@/lib/issuance";
import { REGULATOR_MONTHS, getRegulatorActions, summariseActions } from "@/lib/regulator";
import { calendarEvents } from "@/lib/marketCalendar";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Markets",
  description:
    "The market desk: named companies in the archive, the primary-issuance pipeline, what the regulators actually issued, the market calendar, and which index tracks each sector - and which four have no index at all.",
};

/**
 * The market desk.
 *
 * Four surfaces were added at once - companies, issuance, regulator actions
 * and the calendar - and four new top-level routes with nothing joining them
 * is four orphans. This page is the join: it says what each one answers, shows
 * a live figure from each so none of them is a dead link, and carries the one
 * table that belongs to no single sector - the mapping from each of the 25
 * sectors to the index that tracks it.
 *
 * Every figure on this desk is still counted off this archive. Nothing here
 * has a price in it, and the page says so at the top rather than in a footnote,
 * because a page called "Markets" invites exactly the wrong assumption if it
 * doesn't.
 */
export default async function MarketsPage() {
  const [signals, issuance, actions] = await Promise.all([
    safeQuery(() => getCompanySignals(Region.INDIA), []),
    safeQuery(() => getIssuanceEvents(Region.INDIA, ISSUANCE_MONTHS), []),
    safeQuery(() => getRegulatorActions(Region.INDIA, REGULATOR_MONTHS), []),
  ]);

  const issued = summariseIssuance(issuance);
  const acted = summariseActions(actions);
  const coverage = bridgeCoverage();
  // Resolved here rather than in the list component: that one runs in the
  // browser, and looking the companies up there would ship the whole
  // dictionary with it. Names only - the chips link, they do not count.
  const sectorRows: MarketSectorRow[] = allBridges().map(({ sector, label, bridge }) => ({
    sector,
    label,
    bridge,
    companies: companiesInSector(sector).map((company) => ({
      key: company.key,
      name: company.name,
    })),
  }));

  const namedCompanies = signals.filter((signal) => signal.total > 0);
  const attributed = signals.reduce((total, signal) => total + signal.total, 0);

  const now = new Date();
  const ahead = calendarEvents(now, new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));

  return (
    <div className="flex flex-col gap-8 pt-6">
      <header className="border-b pb-6" style={{ borderColor: "var(--rule-strong)" }}>
        <span className="kicker flex items-center gap-1.5 text-[var(--cat-economy)]">
          <CandlestickChart className="h-3.5 w-3.5" aria-hidden />
          Market desk
        </span>
        <h1 className="headline mt-2 text-[32px] leading-[1.06] text-[var(--text-primary)] sm:text-[46px]">
          The market side of the archive
        </h1>
        <p className="measure mt-3 text-[15px] leading-relaxed text-[var(--text-secondary)]">
          The same stories, read for who they name and what they change: the
          companies the archive talks about, the equity and debt being raised,
          what the regulators actually issued as against what was written about
          them, and the dates the market year turns on.
        </p>
        <p
          className="measure mt-3 border-l-2 pl-3 text-[13px] leading-relaxed text-[var(--text-muted)]"
          style={{ borderColor: "var(--cat-geopolitics)" }}
        >
          <strong>There are no prices anywhere on this desk.</strong> Exchange
          data is licensed and this project holds no licence, so every figure
          here is a count of coverage, not a level, a return or a valuation.
          Nothing on these pages is investment advice, and every number links
          back to the stories it was counted from.
        </p>
      </header>

      <Section
        index="01"
        title="What is here"
        accentVar="--cat-economy"
        description="Four readings of the archive, each answering a question the feed cannot."
      >
        <div className="grid gap-px sm:grid-cols-2" style={{ backgroundColor: "var(--rule)" }}>
          <DeskCard
            href="/company"
            icon={Building2}
            colorVar="--cat-business"
            title="Companies"
            figure={`${count(namedCompanies.length)} named`}
            description="Every story that names a company, gathered onto that company's own timeline - with who it is most often named alongside."
          />
          <DeskCard
            href="/issuance"
            icon={CandlestickChart}
            colorVar="--cat-investment"
            title="Issuance"
            figure={`${count(issued.total)} events`}
            description={`IPOs, QIPs, rights issues, buybacks and block deals over ${ISSUANCE_MONTHS} months, sorted by instrument and by how far each has got.`}
          />
          <DeskCard
            href="/regulators"
            icon={Gavel}
            colorVar="--cat-policy"
            title="Regulator actions"
            figure={`${count(acted.binding)} binding`}
            description={`What ${count(acted.byRegulator.length)} regulators issued over ${REGULATOR_MONTHS} months, split by instrument and by who it binds.`}
          />
          <DeskCard
            href="/calendar"
            icon={CalendarDays}
            colorVar="--cat-trade"
            title="Calendar"
            figure={`${count(ahead.length)} in 30 days`}
            description="The fiscal, tax, results and derivatives dates the year turns on - derived from the rules, never guessed."
          />
        </div>
      </Section>

      <Section
        index="02"
        title="Sectors and what tracks them"
        accentVar="--cat-economy"
        note={`${coverage.indices} indices`}
        description="The bridge from the sector desk to the instruments a reader can actually look up."
      >
        <div className="flex flex-col gap-6">
          <StatRow>
            <StatTile
              label="Sectors tracked"
              value={`${count(coverage.tracked)} of ${count(coverage.tracked + coverage.untracked)}`}
              note="Have at least one index against them"
            />
            <StatTile
              label="Sectors untracked"
              value={count(coverage.untracked)}
              note="No listed index covers the theme"
              deltaTone="down"
            />
            <StatTile label="Distinct indices" value={count(coverage.indices)} note="Across NSE and BSE" />
            <StatTile
              label="Companies in dictionary"
              value={count(COMPANIES.length)}
              note={`${count(COMPANIES.filter((company) => company.listed).length)} listed`}
            />
            <StatTile
              label="Stories attributed"
              value={count(attributed)}
              note="Company-tagged, India desk"
            />
            <StatTile label="Price data" value="None" note="No exchange licence - by design" />
          </StatRow>

          <p className="measure text-[13.5px] leading-relaxed text-[var(--text-secondary)]">
            Which industry maps to which index is an editorial judgement, and
            the list below carries index <em>names</em> only - no symbols, no
            levels, no fund lists. Verify with the exchange before acting on
            any of it. Open a sector for what each index actually holds, how
            the theme is reachable in practice, and the companies this archive
            tracks under it. The rows marked <em>no index</em> are not
            omissions: four of these sectors have nothing tracking them at all,
            which is the most useful thing here.
          </p>

          <MarketSectorList rows={sectorRows} />
        </div>
      </Section>

      <Section
        index="03"
        title="How to read this desk"
        accentVar="--cat-economy"
        description="What each surface counts, and what none of them can see."
      >
        <dl className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
          <Definition term="Companies">
            Matched against a curated dictionary of about three hundred names,
            not an extraction model. Precise rather than exhaustive: a company
            page shows every story that named that company in a way the
            dictionary recognises, and misses the ones written around it.
          </Definition>
          <Definition term="Issuance">
            Classified from headlines, so it is the <em>reported</em> pipeline
            rather than the exchange&rsquo;s filing record. An issue nobody wrote
            about is not here, and one story about an IPO is one event.
          </Definition>
          <Definition term="Regulator actions">
            The instrument type and the audience are read from the headline. It
            can tell you that a circular landed and roughly whom it binds; it
            cannot tell you the effective date or the operative change, because
            it has not read the notification.
          </Definition>
          <Definition term="Calendar">
            Only dates derivable from statute or a published framework are
            generated. Anything this project cannot confirm - the derivatives
            expiry day, the Budget date, MPC meetings - is either flagged for
            verification or read out of the archive rather than predicted.
          </Definition>
          <Definition term="Indices">
            Names and exchanges only. There is no price, weight, constituent
            list or fund data anywhere on this desk, and the mapping from
            sector to index is editorial.
          </Definition>
          <Definition term="What this is not">
            A terminal. Everything here is measured over months, because that
            is the resolution at which policy attention and capital actually
            move, and because this archive has no intraday anything in it.
          </Definition>
        </dl>
      </Section>
    </div>
  );
}

function DeskCard({
  href,
  icon: Icon,
  colorVar,
  title,
  figure,
  description,
}: {
  href: string;
  icon: LucideIcon;
  colorVar: string;
  title: string;
  figure: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 p-4 transition-colors sm:p-5"
      style={{ backgroundColor: "var(--surface-1)" }}
    >
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" style={{ color: `var(${colorVar})` }} aria-hidden />
        <span className="headline text-[20px] text-[var(--text-primary)] underline-offset-4 group-hover:underline">
          {title}
        </span>
        <span className="meta ml-auto text-[11px]" style={{ color: `var(${colorVar})` }}>
          {figure}
        </span>
      </span>
      <span className="text-[13.5px] leading-relaxed text-[var(--text-secondary)]">
        {description}
      </span>
    </Link>
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
