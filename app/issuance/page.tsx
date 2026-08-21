import type { Metadata } from "next";
import Link from "next/link";
import { CandlestickChart } from "lucide-react";
import { Region } from "@/lib/enums";
import { safeQuery } from "@/lib/safeQuery";
import { Section } from "@/components/Section";
import { StatRow, StatTile } from "@/components/StatTile";
import { EventRow, KindBadge, MetaChip } from "@/components/EventRow";
import { RankedBars } from "@/components/charts/RankedBars";
import { count, percent } from "@/components/charts/chartUtils";
import {
  ISSUANCE_KINDS,
  ISSUANCE_MONTHS,
  getIssuanceEvents,
  issuanceKindMeta,
  issuanceStatusLabel,
  summariseIssuance,
  type IssuanceKind,
} from "@/lib/issuance";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Issuance",
  description:
    "India's reported primary-issuance pipeline - IPOs, QIPs, rights issues, offers for sale, buybacks and block deals, sorted by instrument and by how far each has got.",
};

/** Events listed before the page starts reporting a remainder instead. */
const VISIBLE_EVENTS = 120;

function isKind(value: string | undefined): value is IssuanceKind {
  return ISSUANCE_KINDS.some((kind) => kind.key === value);
}

/**
 * The primary-issuance desk.
 *
 * Everything here was already in the archive as prose. What the page adds is
 * the two facts a reader actually needs from an issuance story and that a
 * headline buries: which instrument, and how far along it is. A filing, an
 * open subscription and a listing are three different events about the same
 * company, and reading them as one undifferentiated stream of "IPO news" is
 * how you miss which of them happened today.
 *
 * The honest caveat sits at the top rather than the bottom: this is the
 * *reported* pipeline, not the exchange's filing record. An issue nobody wrote
 * about is not here.
 */
export default async function IssuancePage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const params = await searchParams;
  const filter = isKind(params.kind) ? params.kind : undefined;

  const events = await safeQuery(() => getIssuanceEvents(Region.INDIA, ISSUANCE_MONTHS), []);
  const summary = summariseIssuance(events);

  const shown = filter ? events.filter((event) => event.kind === filter) : events;
  const listed = shown.slice(0, VISIBLE_EVENTS);
  const hidden = shown.length - listed.length;

  const equity = summary.byKind
    .filter((entry) => entry.kind !== "bond" && entry.kind !== "delisting")
    .reduce((total, entry) => total + entry.count, 0);
  const ipos = summary.byKind.find((entry) => entry.kind === "ipo")?.count ?? 0;
  const withAmount = events.filter((event) => event.amount !== null).length;

  return (
    <div className="flex flex-col gap-8 pt-6">
      <header className="border-b pb-6" style={{ borderColor: "var(--rule-strong)" }}>
        <span className="kicker flex items-center gap-1.5 text-[var(--cat-investment)]">
          <CandlestickChart className="h-3.5 w-3.5" aria-hidden />
          Market desk
        </span>
        <h1 className="headline mt-2 text-[32px] leading-[1.06] text-[var(--text-primary)] sm:text-[46px]">
          Who is raising money
        </h1>
        <p className="measure mt-3 text-[15px] leading-relaxed text-[var(--text-secondary)]">
          Every IPO, placement, rights issue, offer for sale, buyback and block
          deal the archive reported over the last {ISSUANCE_MONTHS} months, read
          out of the headlines and sorted by instrument and by stage.
        </p>
        <p
          className="measure mt-3 border-l-2 pl-3 text-[13px] leading-relaxed text-[var(--text-muted)]"
          style={{ borderColor: "var(--cat-geopolitics)" }}
        >
          This is the <strong>reported</strong> pipeline, not the exchange&rsquo;s
          filing record: an issue nobody wrote about is not here, and one story
          is one event, so a heavily-covered IPO appears once per story rather
          than once in total. Classification is read from headlines and will get
          some of them wrong - every row links to the story it came from.
        </p>
      </header>

      <Section
        index="01"
        title="The pipeline"
        accentVar="--cat-investment"
        note={`${ISSUANCE_MONTHS} months`}
        description="What is being raised, and how it splits across instruments."
      >
        <div className="flex flex-col gap-8">
          <StatRow>
            <StatTile label="Events" value={count(summary.total)} note="Classified issuance stories" />
            <StatTile label="Equity raises" value={count(equity)} note="IPOs, placements, rights and buybacks" />
            <StatTile label="IPO stories" value={count(ipos)} note="From draft papers to debut" />
            <StatTile
              label="Named to a company"
              value={percent(summary.total > 0 ? summary.named / summary.total : 0)}
              note="Matched to the company dictionary"
            />
            <StatTile
              label="With a sum stated"
              value={percent(summary.total > 0 ? withAmount / summary.total : 0)}
              note="Headline or excerpt gave a figure"
            />
            <StatTile
              label="Instruments seen"
              value={count(summary.byKind.length)}
              note={`of ${count(ISSUANCE_KINDS.length)} tracked`}
            />
          </StatRow>

          <div className="rail flex flex-wrap items-center gap-1.5">
            <span className="kicker mr-1 shrink-0 text-[10px] text-[var(--text-muted)]">
              Instrument
            </span>
            <FilterChip href="/issuance" active={!filter} label={`All (${count(summary.total)})`} />
            {summary.byKind.map((entry) => {
              const meta = issuanceKindMeta(entry.kind);
              return (
                <FilterChip
                  key={entry.kind}
                  href={`/issuance?kind=${entry.kind}`}
                  active={filter === entry.kind}
                  label={`${meta.label} (${count(entry.count)})`}
                  colorVar={meta.colorVar}
                  title={meta.description}
                />
              );
            })}
          </div>

          {summary.byStatus.length > 0 && (
            <div>
              <p className="kicker mb-3 text-[10px] text-[var(--text-primary)]">By stage</p>
              <RankedBars
                rows={summary.byStatus.map((entry) => ({
                  label: issuanceStatusLabel(entry.status),
                  value: entry.count,
                }))}
                unit="events"
              />
            </div>
          )}
        </div>
      </Section>

      <Section
        index="02"
        title={filter ? issuanceKindMeta(filter).label : "Every event"}
        accentVar="--cat-investment"
        note={`${count(shown.length)} events`}
        description={
          filter
            ? issuanceKindMeta(filter).description
            : "Newest first. The chip is the instrument; the stage and any company named follow the headline."
        }
      >
        {listed.length === 0 ? (
          <p className="text-[15px] leading-relaxed text-[var(--text-muted)]">
            Nothing classified in this window yet - run an ingest to populate
            the archive.
          </p>
        ) : (
          <>
            <ul className="flex flex-col">
              {listed.map((event) => {
                const meta = issuanceKindMeta(event.kind);
                return (
                  <EventRow
                    key={event.id}
                    id={event.id}
                    title={event.title}
                    url={event.url}
                    sourceName={event.sourceName}
                    publishedAt={new Date(event.publishedAt)}
                    category={event.category}
                    badge={
                      <KindBadge
                        label={meta.label}
                        colorVar={meta.colorVar}
                        title={meta.description}
                      />
                    }
                    tags={
                      <>
                        <MetaChip title="Stage, as the story reported it">
                          {issuanceStatusLabel(event.status)}
                        </MetaChip>
                        {event.companies.slice(0, 3).map((company) => (
                          <MetaChip
                            key={company.key}
                            href={`/company/${company.key}`}
                            title="Open this company's timeline"
                          >
                            {company.name}
                          </MetaChip>
                        ))}
                      </>
                    }
                    trailing={
                      event.amount && (
                        <span className="meta text-[12px] text-[var(--text-primary)]">
                          {event.amount}
                        </span>
                      )
                    }
                  />
                );
              })}
            </ul>
            {hidden > 0 && (
              <p className="mt-4 text-[12.5px] text-[var(--text-muted)]">
                {count(hidden)} further events in this window are not listed.
                Narrow by instrument above to see them.
              </p>
            )}
          </>
        )}
      </Section>

      {summary.topCompanies.length > 0 && (
        <Section
          index="03"
          title="Most active names"
          accentVar="--cat-investment"
          description="Companies appearing most often across the window's issuance stories."
        >
          <div className="grid gap-x-10 gap-y-6 lg:grid-cols-2">
            <RankedBars
              rows={summary.topCompanies.map((company) => ({
                label: company.name,
                value: company.count,
              }))}
              unit="events"
            />
            <div>
              <p className="measure text-[13.5px] leading-relaxed text-[var(--text-secondary)]">
                Coverage, not size. A company appears here because several
                stories were written about its raise, which tracks how newsworthy
                the issue was rather than how large it was - a small,
                contentious IPO will out-rank a large routine placement.
              </p>
              <ul className="mt-4 flex flex-wrap gap-x-2 gap-y-1.5">
                {summary.topCompanies.map((company) => (
                  <li key={company.key}>
                    <Link
                      href={`/company/${company.key}`}
                      className="border px-2 py-[2px] text-[12px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--ink-wash)]"
                      style={{ borderColor: "var(--rule-strong)" }}
                    >
                      {company.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>
      )}

      <Section
        index="04"
        title="How to read this"
        accentVar="--cat-investment"
        description="What each instrument is, and what the stages mean."
      >
        <dl className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
          {ISSUANCE_KINDS.map((kind) => (
            <div key={kind.key}>
              <dt className="kicker text-[10px]" style={{ color: `var(${kind.colorVar})` }}>
                {kind.label}
              </dt>
              <dd className="measure mt-1 text-[13.5px] leading-relaxed text-[var(--text-secondary)]">
                {kind.description}
              </dd>
            </div>
          ))}
        </dl>
        <p className="measure mt-6 text-[13px] leading-relaxed text-[var(--text-muted)]">
          <strong>Stage</strong> is where the story says the issue has got to -
          filed, approved, open, allotted, listed or withdrawn - and an item is
          filed under the furthest point it reports, so a story about a listing
          is a listing story even when it recaps the filing. Where a story
          states neither, the stage reads &ldquo;announced&rdquo;.
        </p>
      </Section>
    </div>
  );
}

function FilterChip({
  href,
  active,
  label,
  colorVar,
  title,
}: {
  href: string;
  active: boolean;
  label: string;
  colorVar?: string;
  title?: string;
}) {
  const accent = colorVar ? `var(${colorVar})` : "var(--text-primary)";
  return (
    <Link
      href={href}
      title={title}
      aria-current={active ? "true" : undefined}
      className="shrink-0 border px-2.5 py-1 text-[12px] transition-colors"
      style={
        active
          ? {
              borderColor: accent,
              backgroundColor: `color-mix(in srgb, ${accent} 15%, var(--surface-1))`,
              color: accent,
              fontWeight: 600,
            }
          : { borderColor: "var(--rule-strong)", color: "var(--text-secondary)" }
      }
    >
      {label}
    </Link>
  );
}
