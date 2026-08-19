import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { Region } from "@/lib/enums";
import { db } from "@/lib/db";
import { safeQuery } from "@/lib/safeQuery";
import { Section } from "@/components/Section";
import { StatRow, StatTile } from "@/components/StatTile";
import { ArticleGrid } from "@/components/ArticleGrid";
import { AreaTrend } from "@/components/charts/AreaTrend";
import { StackedShare } from "@/components/charts/StackedShare";
import { DivergingBars } from "@/components/charts/DivergingBars";
import { RankedBars } from "@/components/charts/RankedBars";
import { count, monthLabel, percent, percentChange } from "@/components/charts/chartUtils";
import { TextSkeleton } from "@/components/Skeleton";
import { SectorReadPanel, SectorReadUnavailable } from "@/components/SectorReadPanel";
import {
  WINDOW_MONTHS,
  getSectorDetail,
  getSectorSignals,
  quarterlyChange,
  sectorByKey,
  type SectorSignal,
} from "@/lib/opportunity";
import { getSectorRead } from "@/lib/sectorBrief";
import { isGeminiConfigured } from "@/lib/gemini";
import { metaForCategory } from "@/lib/categoryMeta";
import { timeAgo } from "@/lib/formatTime";

export const revalidate = 0;

// The market primer is a model call with two 30s attempts behind it; the
// platform's 10s default would kill the request before the first returned.
export const maxDuration = 60;

const RECENT_STORIES = 12;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sector: string }>;
}): Promise<Metadata> {
  const sector = sectorByKey((await params).sector);
  if (!sector) return { title: "Sector not found" };
  return {
    title: `${sector.label} · Opportunities`,
    description: `Coverage momentum, state support, capital activity and a market primer for ${sector.label} in India.`,
  };
}

/**
 * One sector, in depth.
 *
 * The page is ordered by how much you can trust it. The measured charts come
 * first — coverage over time, where that coverage sits across the eight
 * sections, quarter-on-quarter direction, who is publishing it — because those
 * are arithmetic on rows this app collected. The market primer comes after,
 * clearly attributed to the model that wrote it. Then the stories themselves,
 * so every claim above has something to click through to.
 */
export default async function SectorPage({
  params,
}: {
  params: Promise<{ sector: string }>;
}) {
  const { sector: key } = await params;
  const sector = sectorByKey(key);
  if (!sector) notFound();

  const [signals, detail, articles] = await Promise.all([
    safeQuery(() => getSectorSignals(Region.INDIA), [] as SectorSignal[]),
    safeQuery(() => getSectorDetail(key, Region.INDIA), { topSources: [] }),
    safeQuery(
      () =>
        db.article.findMany({
          where: { region: Region.INDIA, tags: { has: key } },
          orderBy: { publishedAt: "desc" },
          include: { source: true },
          take: RECENT_STORIES,
        }),
      []
    ),
  ]);

  const signal = signals.find((entry) => entry.key === key);
  const quarters = signal ? quarterlyChange(signal.monthly, signal.monthlyShare) : [];
  const peak = signal
    ? signal.monthly.reduce((best, point) => (point.count > best.count ? point : best), signal.monthly[0])
    : undefined;

  return (
    <div className="flex flex-col gap-8 pt-6">
      <header className="border-b pb-6" style={{ borderColor: "var(--rule-strong)" }}>
        <Link
          href="/opportunities"
          className="kicker inline-flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-3 w-3" aria-hidden />
          All sectors
        </Link>
        <h1 className="headline mt-2 text-[32px] leading-[1.06] text-[var(--text-primary)] sm:text-[46px]">
          {sector.label}
        </h1>
        <p className="measure mt-3 text-[15px] leading-relaxed text-[var(--text-secondary)]">
          What {WINDOW_MONTHS} months of Indian policy and business coverage says about
          this sector, followed by the market figures the archive cannot measure.
        </p>
      </header>

      {!signal || signal.total === 0 ? (
        <Section index="01" title="No coverage yet" accentVar="--cat-investment">
          <p className="measure text-[15px] leading-relaxed text-[var(--text-secondary)]">
            The archive holds nothing tagged to {sector.label} in this window.{" "}
            <Link href="/opportunities" className="underline underline-offset-2">
              Back to the board
            </Link>
            .
          </p>
        </Section>
      ) : (
        <>
          <Section
            index="01"
            title="The signal"
            accentVar="--cat-investment"
            note={`${WINDOW_MONTHS} months`}
            description="Measured from this archive. Counts are stories, not rupees — and every rate is this sector's share of all coverage, so it cannot be inflated by the archive simply growing."
          >
            <div className="flex flex-col gap-9">
              <StatRow>
                <StatTile
                  label="Stories"
                  value={count(signal.total)}
                  note={`Tagged ${sector.label.toLowerCase()}`}
                />
                <StatTile
                  label="Last 90 days"
                  value={count(signal.recent)}
                  delta={
                    signal.momentum === null
                      ? "too few to rate"
                      : `${percentChange(signal.momentum)} share vs prior quarter`
                  }
                  deltaTone={
                    signal.momentum === null ? "neutral" : signal.momentum >= 0 ? "up" : "down"
                  }
                />
                <StatTile
                  label="Share of coverage"
                  value={percent(signal.share)}
                  note={`Of everything on the India desk`}
                />
                <StatTile
                  label="State-driven"
                  value={percent(signal.policyShare)}
                  note="Policy, regulation or subsidy news"
                />
                <StatTile
                  label="Capital"
                  value={percent(signal.capitalShare)}
                  note="Investment and FDI news"
                />
                <StatTile
                  label="Share CAGR"
                  value={percentChange(signal.cagr)}
                  note="Compound annual growth of its share"
                />
                <StatTile
                  label="Last filed"
                  value={signal.latestAt ? timeAgo(new Date(signal.latestAt)) : "—"}
                  note={`${detail.topSources.length} publishers filing`}
                />
              </StatRow>

              <Panel
                title="Coverage by month"
                caption={
                  peak
                    ? `Peaked at ${count(peak.count)} stories in ${monthLabel(peak.month)}.`
                    : undefined
                }
              >
                <AreaTrend points={signal.monthly} label={`${sector.label} coverage`} />
                <NumbersTable
                  head={["Month", "Stories", "Share"]}
                  rows={signal.monthly
                    .slice()
                    .reverse()
                    .map((point, i) => [
                      monthLabel(point.month),
                      count(point.count),
                      percent(signal.monthlyShare[signal.monthlyShare.length - 1 - i].count),
                    ])}
                />
              </Panel>

              <Panel
                title="Quarter on quarter"
                caption="Change in this sector's share of all coverage, against the previous quarter. Share rather than story count, so a quarter in which the whole archive grew does not read as this sector growing. Direction is the point — the bars share one symmetric scale."
              >
                <DivergingBars rows={quarters} />
              </Panel>

              <Panel
                title="What kind of news this is"
                caption="How the sector's coverage splits across the eight sections. A sector weighted towards policy moves when the government moves; one weighted towards investment is already attracting money."
              >
                <StackedShare parts={signal.byCategory} total={signal.total} />
                <NumbersTable
                  head={["Section", "Stories", "Share"]}
                  rows={signal.byCategory.map((part) => [
                    metaForCategory(part.category).label,
                    count(part.count),
                    percent(part.count / signal.total),
                  ])}
                />
              </Panel>

              {detail.topSources.length > 0 && (
                <Panel
                  title="Who is covering it"
                  caption="The publishers filing most on this sector. A sector covered only by regulators reads differently from one covered by newsrooms."
                >
                  <RankedBars rows={detail.topSources.map((s) => ({ label: s.name, value: s.count }))} />
                </Panel>
              )}
            </div>
          </Section>

          <Section
            index="02"
            title="The market"
            accentVar="--cat-tech"
            note="written by Gemini"
            description="Size, growth, the ratios that matter for this industry, and the routes into it — estimates, not measurements."
          >
            <Suspense fallback={<MarketPending />}>
              <MarketRead sector={sector.label} headlines={articles.map((a) => a.title)} />
            </Suspense>
          </Section>

          {articles.length > 0 && (
            <Section
              index="03"
              title="What is actually happening"
              accentVar="--cat-investment"
              note={`${articles.length} latest`}
              description="The stories the numbers above were counted from, newest first."
            >
              <div className="flex flex-col gap-5">
                <ArticleGrid articles={articles} startIndex={1} />
                <Link
                  href={`/?tags=${key}&range=1y`}
                  className="kicker self-start border px-3 py-1.5 text-[10px] text-[var(--text-primary)] transition-colors hover:bg-[var(--ink-wash)]"
                  style={{ borderColor: "var(--rule-strong)" }}
                >
                  Every {sector.label} story in the archive
                </Link>
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  );
}

/** The model call, isolated so the measured half of the page renders first. */
async function MarketRead({ sector, headlines }: { sector: string; headlines: string[] }) {
  const read = await getSectorRead(sector, headlines);
  if (!read) return <SectorReadUnavailable configured={isGeminiConfigured()} />;
  return <SectorReadPanel read={read} />;
}

function MarketPending() {
  return (
    <div className="flex animate-pulse flex-col gap-6">
      <TextSkeleton lines={3} />
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <span
            key={i}
            className="block h-14 border-l pl-3"
            style={{ borderColor: "var(--rule-strong)", backgroundColor: "var(--ink-wash)" }}
          />
        ))}
      </div>
    </div>
  );
}

function Panel({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="kicker text-[10px] text-[var(--text-primary)]">{title}</h3>
        {caption && (
          <p className="measure mt-1 text-[12.5px] leading-relaxed text-[var(--text-muted)]">
            {caption}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

/**
 * Every chart's numbers, one click away.
 *
 * A chart that cannot be read as a table is a chart some readers cannot read at
 * all — screen readers, anyone who needs an exact value rather than a position,
 * and anyone checking the shape against the figures. Collapsed by default so it
 * costs nothing to the reader who does not need it.
 */
function NumbersTable({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <details className="mt-1">
      <summary className="kicker cursor-pointer list-none text-[9px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] [&::-webkit-details-marker]:hidden">
        Show the numbers
      </summary>
      <div className="mt-2 max-h-64 overflow-y-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--rule-strong)" }}>
              {head.map((cell, i) => (
                <th
                  key={cell}
                  className={`kicker py-1.5 text-[9px] text-[var(--text-muted)] ${i > 0 ? "text-right" : ""}`}
                >
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[0]} className="border-b" style={{ borderColor: "var(--rule)" }}>
                {row.map((cell, i) => (
                  <td
                    key={i}
                    className={`py-1.5 text-[12px] ${
                      i > 0
                        ? "meta text-right text-[var(--text-primary)]"
                        : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
