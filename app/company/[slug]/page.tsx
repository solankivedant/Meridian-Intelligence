import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Region } from "@/lib/enums";
import { db } from "@/lib/db";
import { safeQuery } from "@/lib/safeQuery";
import { Section } from "@/components/Section";
import { StatRow, StatTile } from "@/components/StatTile";
import { ArticleGrid } from "@/components/ArticleGrid";
import { AreaTrend } from "@/components/charts/AreaTrend";
import { StackedShare } from "@/components/charts/StackedShare";
import { RankedBars } from "@/components/charts/RankedBars";
import { InstrumentPanel } from "@/components/InstrumentPanel";
import { count, monthLabel, percentChange } from "@/components/charts/chartUtils";
import { metaForSector } from "@/lib/sectorMeta";
import { metaForCategory } from "@/lib/categoryMeta";
import { timeAgo } from "@/lib/formatTime";
import { companyByKey, companiesInSector } from "@/lib/entities";
import { bridgeForSector } from "@/lib/instruments";
import {
  WINDOW_MONTHS,
  getCompanyDetail,
  getCompanySignals,
  type CompanySignal,
} from "@/lib/company";

export const revalidate = 0;

const RECENT_STORIES = 12;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const company = companyByKey((await params).slug);
  if (!company) return { title: "Company not found" };
  return {
    title: `${company.name} · Companies`,
    description: `Every policy, regulatory and business story in the archive that names ${company.name}, with coverage over time and who it is most often named alongside.`,
  };
}

/**
 * One company, on one timeline.
 *
 * The page is ordered the same way the sector pages are: measured things
 * first, stories last, and nothing in between that this archive cannot
 * support. Coverage over time, where that coverage sits across the eight
 * sections, who else is named in the same stories, who is publishing them -
 * all arithmetic on rows this app collected.
 *
 * There is no company *profile* here, and that omission is deliberate rather
 * than unfinished. Revenue, market capitalisation, shareholding, results - the
 * things a reader arriving at a page titled with a company name half expects -
 * are none of them in this archive, and a model-written paragraph asserting
 * them would be the one thing on the site that could be confidently wrong
 * about a named business. The sector pages carry a labelled model-written
 * primer because a market is a diffuse subject; a company is not.
 */
/**
 * A company's share of the whole archive, at the scale it actually occurs.
 *
 * The shared `percent()` rounds to whole points, which is right for a sector
 * holding 8% of coverage and useless here: every company in the dictionary
 * except a handful sits under half a point, so the tile read "0%" for all of
 * them - a number that looks like a bug rather than like a small share. One
 * decimal down to a tenth, and an explicit floor below that.
 */
function shareLabel(share: number): string {
  if (share <= 0) return "0%";
  if (share < 0.001) return "<0.1%";
  return `${(share * 100).toFixed(1)}%`;
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const company = companyByKey(slug);
  if (!company) notFound();

  const [signals, detail, articles] = await Promise.all([
    safeQuery(() => getCompanySignals(Region.INDIA), [] as CompanySignal[]),
    safeQuery(() => getCompanyDetail(slug, Region.INDIA), { topSources: [], alongside: [] }),
    safeQuery(
      () =>
        db.article.findMany({
          where: { region: Region.INDIA, entities: { has: slug } },
          orderBy: { publishedAt: "desc" },
          include: { source: true },
          take: RECENT_STORIES,
        }),
      []
    ),
  ]);

  const signal = signals.find((entry) => entry.company.key === slug);
  const face = metaForSector(company.sector);
  const Icon = face.icon;
  const bridge = bridgeForSector(company.sector);
  const peers = companiesInSector(company.sector).filter((peer) => peer.key !== slug);

  const total = signal?.total ?? 0;
  const peak = signal?.monthly.reduce(
    (best, point) => (point.count > best.count ? point : best),
    signal.monthly[0] ?? { month: "", count: 0 }
  );
  const topSection = signal?.byCategory[0];

  return (
    <div className="flex flex-col gap-8 pt-6">
      <header
        className="border-t-4 pt-4"
        style={{ borderColor: `var(${face.colorVar})` }}
      >
        <Link
          href="/company"
          className="kicker inline-flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-3 w-3" aria-hidden />
          All companies
        </Link>

        <div className="mt-3 flex items-start gap-3.5">
          <span
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center"
            style={{
              color: `var(${face.colorVar})`,
              backgroundColor: `color-mix(in srgb, var(${face.colorVar}) 13%, transparent)`,
            }}
          >
            <Icon className="h-5.5 w-5.5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="headline text-[30px] leading-[1.06] text-[var(--text-primary)] sm:text-[42px]">
              {company.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              {company.ticker ? (
                <span className="meta text-[11px] text-[var(--text-primary)]">
                  {company.ticker}
                </span>
              ) : (
                <span className="kicker text-[9px] text-[var(--text-muted)]">
                  Not listed
                </span>
              )}
              <Link
                href={`/opportunities/${company.sector}`}
                className="border px-2 py-[2px] text-[12px] transition-colors hover:bg-[var(--ink-wash)]"
                style={{ borderColor: "var(--rule-strong)", color: "var(--text-secondary)" }}
              >
                {face.label}
              </Link>
              {company.group && (
                <span className="text-[12.5px] text-[var(--text-muted)]">
                  {company.group} group
                </span>
              )}
              {signal?.latestAt && (
                <span className="meta text-[11px]">
                  last written about {timeAgo(new Date(signal.latestAt))}
                </span>
              )}
            </div>
          </div>
        </div>

        <p
          className="measure mt-4 border-l-2 pl-3 text-[13px] leading-relaxed text-[var(--text-muted)]"
          style={{ borderColor: "var(--cat-geopolitics)" }}
        >
          Everything below counts how often this company was <strong>written
          about</strong> - it is not a profile, a valuation or a view. There are
          no financials or prices on this page because this archive holds none,
          and nothing here is investment advice.
        </p>
      </header>

      {total === 0 ? (
        <Section index="01" title="No coverage yet" accentVar={face.colorVar}>
          <p className="measure text-[15px] leading-relaxed text-[var(--text-secondary)]">
            The archive holds no story naming {company.name} in the last{" "}
            {WINDOW_MONTHS} months. That is a real answer for a company this
            dictionary tracks but the ingested feeds rarely name - and it is
            also what this page shows before{" "}
            <code className="meta text-[12px]">npm run entities -- --apply</code>{" "}
            has been run over the existing archive.
          </p>
        </Section>
      ) : (
        <Section
          index="01"
          title="Coverage"
          accentVar={face.colorVar}
          note={`${WINDOW_MONTHS} months`}
          description="How often this company is named, and where in the archive it sits."
        >
          <div className="flex flex-col gap-8">
            <StatRow>
              <StatTile label="Stories" value={count(total)} note={`Naming ${company.name}`} />
              <StatTile
                label="Last 90 days"
                value={count(signal?.recent ?? 0)}
                delta={percentChange(signal?.momentum ?? null)}
                deltaTone={(signal?.momentum ?? 0) >= 0 ? "up" : "down"}
                note="Against the 90 days before"
              />
              <StatTile
                label="Share of archive"
                value={shareLabel(signal?.share ?? 0)}
                note="Of all India-desk coverage in the window"
              />
              {peak && peak.count > 0 && (
                <StatTile
                  label="Busiest month"
                  value={count(peak.count)}
                  note={monthLabel(peak.month)}
                />
              )}
              {topSection && (
                <StatTile
                  label="Mostly filed under"
                  value={metaForCategory(topSection.category).shortLabel}
                  note={`${count(topSection.count)} of ${count(total)} stories`}
                />
              )}
              <StatTile
                label="Named alongside"
                value={count(detail.alongside.length)}
                note="Other tracked companies in the same stories"
              />
            </StatRow>

            {signal && (
              <div className="grid gap-x-10 gap-y-8 lg:grid-cols-2">
                <figure className="m-0">
                  <figcaption className="kicker mb-3 text-[10px] text-[var(--text-primary)]">
                    Stories per month
                  </figcaption>
                  <AreaTrend points={signal.monthly} label={`stories naming ${company.name}`} />
                </figure>
                <figure className="m-0">
                  <figcaption className="kicker mb-3 text-[10px] text-[var(--text-primary)]">
                    Across the eight sections
                  </figcaption>
                  <StackedShare parts={signal.byCategory} total={total} />
                </figure>
              </div>
            )}
          </div>
        </Section>
      )}

      {(detail.alongside.length > 0 || detail.topSources.length > 0) && (
        <Section
          index="02"
          title="Context"
          accentVar={face.colorVar}
          description="Who this company appears beside, and who is doing the writing."
        >
          <div className="grid gap-x-10 gap-y-8 lg:grid-cols-2">
            {detail.alongside.length > 0 && (
              <div>
                <p className="kicker mb-1.5 text-[10px] text-[var(--text-primary)]">
                  Named in the same stories
                </p>
                <p className="measure mb-4 text-[12.5px] leading-relaxed text-[var(--text-muted)]">
                  Counted, not asserted - these names simply appeared together.
                  A regulator&rsquo;s circular naming six banks does this, and so
                  does one side of a deal.
                </p>
                <RankedBars
                  rows={detail.alongside.map((entry) => ({
                    label: entry.name,
                    value: entry.count,
                  }))}
                />
                <ul className="mt-3 flex flex-wrap gap-x-2 gap-y-1.5">
                  {detail.alongside.map((entry) => (
                    <li key={entry.key}>
                      <Link
                        href={`/company/${entry.key}`}
                        className="border px-2 py-[2px] text-[12px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--ink-wash)]"
                        style={{ borderColor: "var(--rule-strong)" }}
                      >
                        {entry.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {detail.topSources.length > 0 && (
              <div>
                <p className="kicker mb-1.5 text-[10px] text-[var(--text-primary)]">
                  Who is publishing
                </p>
                <p className="measure mb-4 text-[12.5px] leading-relaxed text-[var(--text-muted)]">
                  The publishers carrying this company most often in the window.
                </p>
                <RankedBars rows={detail.topSources.map((source) => ({ label: source.name, value: source.count }))} />
              </div>
            )}
          </div>
        </Section>
      )}

      <Section
        index="03"
        title="Sector and instruments"
        accentVar={face.colorVar}
        description={`Where ${company.name} sits on the sector desk, and what tracks that sector.`}
      >
        <div className="grid gap-x-10 gap-y-8 lg:grid-cols-2">
          <div>
            <p className="kicker mb-3 text-[10px] text-[var(--text-primary)]">
              Tracked by
            </p>
            <InstrumentPanel bridge={bridge} />
            <p className="measure mt-4 text-[12.5px] leading-relaxed text-[var(--text-muted)]">
              Index names and exchanges only - an editorial mapping from sector
              to instrument, with no symbols, levels or fund data behind it.
              Verify with the exchange before relying on any of it.
            </p>
          </div>

          {peers.length > 0 && (
            <div>
              <p className="kicker mb-3 text-[10px] text-[var(--text-primary)]">
                Others in {face.label}
              </p>
              <ul className="flex flex-wrap gap-x-2 gap-y-1.5">
                {peers.map((peer) => (
                  <li key={peer.key}>
                    <Link
                      href={`/company/${peer.key}`}
                      className="border px-2 py-[2px] text-[12px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--ink-wash)]"
                      style={{ borderColor: "var(--rule-strong)" }}
                    >
                      {peer.name}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href={`/opportunities/${company.sector}`}
                className="mt-4 inline-block text-[13px] text-[var(--text-secondary)] underline underline-offset-2 hover:text-[var(--text-primary)]"
              >
                Open the {face.label} dashboard
              </Link>
            </div>
          )}
        </div>
      </Section>

      {articles.length > 0 && (
        <Section
          index="04"
          title="Latest stories"
          accentVar={face.colorVar}
          note={`${count(articles.length)} shown`}
          description="Every figure above was counted from stories like these."
        >
          <ArticleGrid articles={articles.slice(1)} feature={articles[0]} startIndex={1} />
        </Section>
      )}
    </div>
  );
}
