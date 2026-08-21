import type { Metadata } from "next";
import Link from "next/link";
import { Gavel } from "lucide-react";
import { Region } from "@/lib/enums";
import { safeQuery } from "@/lib/safeQuery";
import { Section } from "@/components/Section";
import { StatRow, StatTile } from "@/components/StatTile";
import { EventRow, KindBadge, MetaChip } from "@/components/EventRow";
import { RankedBars } from "@/components/charts/RankedBars";
import { count, percent } from "@/components/charts/chartUtils";
import {
  ACTION_KINDS,
  REGULATORS,
  REGULATOR_MONTHS,
  actionKindMeta,
  getRegulatorActions,
  regulatorByKey,
  summariseActions,
  type ActionKind,
} from "@/lib/regulator";

function isActionKind(value: string | undefined): value is ActionKind {
  return ACTION_KINDS.some((kind) => kind.key === value);
}

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Regulators",
  description:
    "What India's regulators actually issued - circulars, master directions, penalties and consultation papers from the RBI, SEBI, IRDAI, TRAI and twenty others, split by instrument and by who each one binds.",
};

/** Actions listed before the page starts reporting a remainder instead. */
const VISIBLE_ACTIONS = 120;

/**
 * The regulator action tracker.
 *
 * The RBI's and SEBI's feeds have been ingested since the first version of
 * this app and have always been flattened into one policy stream. This page
 * separates the two things that stream throws away: what kind of instrument
 * each item is, and who it lands on.
 *
 * The lead figure is the binding count rather than the total, and that choice
 * is the whole argument for the page. A regulator that issued eleven things
 * last month and bound somebody with three of them is doing something quite
 * different from one that bound somebody with all eleven, and no volume count
 * can tell those apart.
 */
export default async function RegulatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ by?: string; kind?: string }>;
}) {
  const params = await searchParams;
  const filter = params.by && regulatorByKey(params.by) ? params.by : undefined;
  const kind = isActionKind(params.kind) ? params.kind : undefined;

  const actions = await safeQuery(() => getRegulatorActions(Region.INDIA, REGULATOR_MONTHS), []);
  const summary = summariseActions(actions);

  // The two facets compose, and each chip row is counted against the *other*
  // facet's filtered set - so narrowing to SEBI re-counts the instrument chips
  // against SEBI alone rather than leaving them showing archive-wide totals.
  const byRegulator = kind ? actions.filter((action) => action.kind === kind) : actions;
  const byKind = filter ? actions.filter((action) => action.regulator.key === filter) : actions;
  const shown = actions.filter(
    (action) =>
      (!filter || action.regulator.key === filter) && (!kind || action.kind === kind)
  );
  const listed = shown.slice(0, VISIBLE_ACTIONS);
  const hidden = shown.length - listed.length;

  const href = (next: { by?: string; kind?: string }) => {
    const search = new URLSearchParams();
    const regulator = "by" in next ? next.by : filter;
    const instrument = "kind" in next ? next.kind : kind;
    if (regulator) search.set("by", regulator);
    if (instrument) search.set("kind", instrument);
    const qs = search.toString();
    return qs ? `/regulators?${qs}` : "/regulators";
  };

  const busiest = summary.byRegulator[0];
  const consultations = summary.byKind.find((entry) => entry.kind === "consultation")?.count ?? 0;
  const penalties = summary.byKind.find((entry) => entry.kind === "penalty")?.count ?? 0;
  const focus = filter ? regulatorByKey(filter) : undefined;

  return (
    <div className="flex flex-col gap-8 pt-6">
      <header className="border-b pb-6" style={{ borderColor: "var(--rule-strong)" }}>
        <span className="kicker flex items-center gap-1.5 text-[var(--cat-policy)]">
          <Gavel className="h-3.5 w-3.5" aria-hidden />
          Market desk
        </span>
        <h1 className="headline mt-2 text-[32px] leading-[1.06] text-[var(--text-primary)] sm:text-[46px]">
          What the regulators actually did
        </h1>
        <p className="measure mt-3 text-[15px] leading-relaxed text-[var(--text-secondary)]">
          Six months of output from {count(REGULATORS.length)} Indian regulators
          and statutory bodies, separated into what it is - a circular, a master
          direction, a penalty, a draft out for comment - and who it binds. A
          consultation paper changes nothing; a master direction changes
          somebody&rsquo;s obligations from a stated date, and a stream that reads
          them alike is how a compliance deadline hides behind a discussion draft.
        </p>
        <p
          className="measure mt-3 border-l-2 pl-3 text-[13px] leading-relaxed text-[var(--text-muted)]"
          style={{ borderColor: "var(--cat-geopolitics)" }}
        >
          Classified from headlines, so it sees the <strong>shape</strong> of the
          flow and not its contents: it cannot give you an effective date or the
          operative change, because it has not read the notification. Treat it
          as an index into the primary sources, never as a compliance record -
          every row links to the story it came from.
        </p>
      </header>

      <Section
        index="01"
        title="The flow"
        accentVar="--cat-policy"
        note={`${REGULATOR_MONTHS} months`}
        description="How much was issued, how much of it binds anyone, and by whom."
      >
        <div className="flex flex-col gap-8">
          <StatRow>
            <StatTile label="Actions" value={count(summary.total)} note="Classified regulatory items" />
            <StatTile
              label="Binding"
              value={count(summary.binding)}
              note={`${percent(summary.total > 0 ? summary.binding / summary.total : 0)} of the flow`}
              deltaTone="up"
            />
            <StatTile
              label="Out for comment"
              value={count(consultations)}
              note="Drafts and consultation papers - nothing binds yet"
            />
            <StatTile label="Penalties" value={count(penalties)} note="Fines, censures and debarments" />
            {busiest && (
              <StatTile
                label="Most active"
                value={busiest.regulator.short}
                note={`${count(busiest.count)} items, ${count(busiest.binding)} binding`}
              />
            )}
            <StatTile
              label="Regulators seen"
              value={`${count(summary.byRegulator.length)} of ${count(REGULATORS.length)}`}
              note="Tracked bodies with output in the window"
            />
          </StatRow>

          <div className="rail flex flex-wrap items-center gap-1.5">
            <span className="kicker mr-1 shrink-0 text-[10px] text-[var(--text-muted)]">
              Regulator
            </span>
            <FilterChip
              href={href({ by: undefined })}
              active={!filter}
              label={`All (${count(byRegulator.length)})`}
            />
            {summariseActions(byRegulator).byRegulator.map((entry) => (
              <FilterChip
                key={entry.regulator.key}
                href={href({ by: entry.regulator.key })}
                active={filter === entry.regulator.key}
                label={`${entry.regulator.short} (${count(entry.count)})`}
                colorVar={entry.regulator.colorVar}
                title={entry.regulator.remit}
              />
            ))}
          </div>

          {/* The instrument filter earns its place on the real distribution:
              four items in five are a data release, a speech or press
              commentary, so a reader who came here for the ones that bind
              somebody needs a way to say so. */}
          <div className="rail flex flex-wrap items-center gap-1.5">
            <span className="kicker mr-1 shrink-0 text-[10px] text-[var(--text-muted)]">
              Instrument
            </span>
            <FilterChip
              href={href({ kind: undefined })}
              active={!kind}
              label={`All (${count(byKind.length)})`}
            />
            {summariseActions(byKind).byKind.map((entry) => {
              const meta = actionKindMeta(entry.kind);
              return (
                <FilterChip
                  key={entry.kind}
                  href={href({ kind: entry.kind })}
                  active={kind === entry.kind}
                  label={`${meta.label} (${count(entry.count)})`}
                  colorVar={meta.binding ? "--cat-policy" : undefined}
                  title={meta.hint}
                />
              );
            })}
          </div>

          <div className="grid gap-x-10 gap-y-8 lg:grid-cols-2">
            <div>
              <p className="kicker mb-1.5 text-[10px] text-[var(--text-primary)]">
                By instrument
              </p>
              <p className="measure mb-4 text-[12.5px] leading-relaxed text-[var(--text-muted)]">
                Ordered by how binding each kind is, not by volume.
              </p>
              <RankedBars
                rows={summary.byKind.map((entry) => ({
                  label: actionKindMeta(entry.kind).label,
                  value: entry.count,
                }))}
                unit="items"
              />
            </div>
            {summary.byAudience.length > 0 && (
              <div>
                <p className="kicker mb-1.5 text-[10px] text-[var(--text-primary)]">
                  Who it lands on
                </p>
                <p className="measure mb-4 text-[12.5px] leading-relaxed text-[var(--text-muted)]">
                  Read from the headline, so it is present only where the item
                  named its audience - the most useful column here and the least
                  complete.
                </p>
                <RankedBars
                  rows={summary.byAudience.map((entry) => ({
                    label: entry.label,
                    value: entry.count,
                  }))}
                  unit="items"
                />
              </div>
            )}
          </div>
        </div>
      </Section>

      <Section
        index="02"
        title={
          kind ? actionKindMeta(kind).label : focus ? focus.name : "Every action"
        }
        accentVar={focus ? focus.colorVar : "--cat-policy"}
        note={`${count(shown.length)} items`}
        description={
          kind
            ? `${actionKindMeta(kind).hint}${focus ? ` - ${focus.name} only.` : "."}`
            : focus
              ? focus.remit
              : "Newest first. The chip is the instrument; the audience chips follow the headline."
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
              {listed.map((action) => {
                const meta = actionKindMeta(action.kind);
                return (
                  <EventRow
                    key={action.id}
                    id={action.id}
                    title={action.title}
                    url={action.url}
                    sourceName={action.sourceName}
                    publishedAt={new Date(action.publishedAt)}
                    category={action.category}
                    badge={
                      <KindBadge
                        label={meta.label}
                        colorVar={action.regulator.colorVar}
                        title={meta.hint}
                      />
                    }
                    tags={
                      <>
                        {!filter && (
                          <MetaChip
                            href={href({ by: action.regulator.key })}
                            title={action.regulator.name}
                          >
                            {action.regulator.short}
                          </MetaChip>
                        )}
                        {action.audiences.slice(0, 3).map((audience) => (
                          <MetaChip key={audience.key} title="Named in the headline">
                            {audience.label}
                          </MetaChip>
                        ))}
                      </>
                    }
                    trailing={
                      <span
                        className="kicker text-[9px]"
                        style={{
                          color: action.binding
                            ? "var(--text-primary)"
                            : "var(--text-muted)",
                        }}
                        title={
                          action.binding
                            ? "Changes an obligation as it stands"
                            : "Does not bind anyone by itself"
                        }
                      >
                        {action.binding ? "Binding" : "Not binding"}
                      </span>
                    }
                  />
                );
              })}
            </ul>
            {hidden > 0 && (
              <p className="mt-4 text-[12.5px] text-[var(--text-muted)]">
                {count(hidden)} further items in this window are not listed.
                Narrow by regulator or instrument above to see them.
              </p>
            )}
          </>
        )}
      </Section>

      <Section
        index="03"
        title="The bodies tracked"
        accentVar="--cat-policy"
        description="Who each one regulates."
      >
        <dl className="grid gap-x-10 gap-y-3.5 sm:grid-cols-2">
          {REGULATORS.map((regulator) => (
            <div key={regulator.key}>
              <dt className="kicker text-[10px]" style={{ color: `var(${regulator.colorVar})` }}>
                <Link href={`/regulators?by=${regulator.key}`} className="hover:underline">
                  {regulator.short}
                </Link>
                <span className="ml-2 font-normal normal-case tracking-normal text-[var(--text-muted)]">
                  {regulator.name}
                </span>
              </dt>
              <dd className="measure mt-0.5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                {regulator.remit}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section
        index="04"
        title="How to read this"
        accentVar="--cat-policy"
        description="What each instrument is, and which of them actually bind."
      >
        <dl className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
          {ACTION_KINDS.map((kind) => (
            <div key={kind.key}>
              <dt className="kicker flex items-center gap-2 text-[10px] text-[var(--text-primary)]">
                {kind.label}
                <span
                  className="text-[9px] font-normal"
                  style={{
                    color: kind.binding ? "var(--cat-policy)" : "var(--text-muted)",
                  }}
                >
                  {kind.binding ? "binding" : "not binding"}
                </span>
              </dt>
              <dd className="measure mt-1 text-[13.5px] leading-relaxed text-[var(--text-secondary)]">
                {kind.hint}
              </dd>
            </div>
          ))}
        </dl>
        <p className="measure mt-6 text-[13px] leading-relaxed text-[var(--text-muted)]">
          &ldquo;Binding&rdquo; here means the instrument changes an obligation as
          it stands, which is a property of the <em>kind</em> of document and
          not a reading of its contents. An approval is marked not binding
          because it permits rather than requires; a consultation paper because
          nothing in it is in force. Where a headline names no instrument, the
          item is filed as a report.
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
