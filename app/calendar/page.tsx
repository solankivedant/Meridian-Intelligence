import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CalendarDays } from "lucide-react";
import { Region } from "@/lib/enums";
import { safeQuery } from "@/lib/safeQuery";
import { Section } from "@/components/Section";
import { StatRow, StatTile } from "@/components/StatTile";
import { KindBadge } from "@/components/EventRow";
import { count } from "@/components/charts/chartUtils";
import { shortDate, timeAgo } from "@/lib/formatTime";
import {
  CALENDAR_KINDS,
  calendarEvents,
  calendarKindMeta,
  daysAway,
  getCalendarAnchors,
  relativeDay,
  type CalendarAnchor,
  type CalendarEvent,
} from "@/lib/marketCalendar";
import { ISSUANCE_MONTHS, getIssuanceEvents } from "@/lib/issuance";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Calendar",
  description:
    "The dates India's market year turns on - fiscal year and quarter ends, the Budget, statutory tax instalments, results deadlines and derivatives expiry, derived from the rules rather than guessed.",
};

const AHEAD_DAYS = 90;
const BEHIND_DAYS = 30;

/**
 * The market calendar.
 *
 * The interesting decision on this page is what it refuses to show. A calendar
 * is the easiest kind of page to fill with confident, wrong dates: type next
 * year's MPC meetings into a file and they render exactly as authoritatively
 * as the fiscal year end, which is derivable, and stay wrong until somebody
 * notices.
 *
 * So the page is built in two registers, and it labels them. Rule-derived
 * dates - the fiscal year, quarter ends, statutory advance tax, the results
 * deadlines set by the listing regulations - are correct for any year without
 * maintenance. Everything else either carries a "verify" caveat on the row
 * itself or is read backwards out of the archive: the RBI's own coverage is a
 * better witness to when the last MPC met than any hardcoded schedule.
 *
 * A dated feed from the exchanges and the regulators would replace half of
 * this, and it is Tier 4B in `futurescope.md` for the licensing reason that
 * governs the whole desk.
 */
export default async function CalendarPage() {
  const now = new Date();
  const ahead = calendarEvents(now, new Date(now.getTime() + AHEAD_DAYS * 24 * 60 * 60 * 1000));
  const behind = calendarEvents(
    new Date(now.getTime() - BEHIND_DAYS * 24 * 60 * 60 * 1000),
    now
  ).reverse();

  const [anchors, issuance] = await Promise.all([
    safeQuery(() => getCalendarAnchors(Region.INDIA), { lastPolicy: null, lastBudget: null }),
    safeQuery(() => getIssuanceEvents(Region.INDIA, ISSUANCE_MONTHS), []),
  ]);

  const open = issuance
    .filter((event) => event.status === "open" || event.status === "filed")
    .slice(0, 6);

  const next = ahead[0];
  const unverified = ahead.filter((event) => event.verify).length;

  return (
    <div className="flex flex-col gap-8 pt-6">
      <header className="border-b pb-6" style={{ borderColor: "var(--rule-strong)" }}>
        <span className="kicker flex items-center gap-1.5 text-[var(--cat-trade)]">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          Market desk
        </span>
        <h1 className="headline mt-2 text-[32px] leading-[1.06] text-[var(--text-primary)] sm:text-[46px]">
          The dates the year turns on
        </h1>
        <p className="measure mt-3 text-[15px] leading-relaxed text-[var(--text-secondary)]">
          The fiscal year, the quarter ends and the results deadlines that
          follow them, the Budget, the statutory tax instalments and the monthly
          derivatives expiry - the scaffolding the rest of this archive&rsquo;s
          coverage hangs off.
        </p>
        <p
          className="measure mt-3 border-l-2 pl-3 text-[13px] leading-relaxed text-[var(--text-muted)]"
          style={{ borderColor: "var(--cat-geopolitics)" }}
        >
          Every date here is <strong>derived from a rule</strong>, never typed
          into a list. Where the rule is statute the date stands on its own;
          where it is convention or exchange policy the row says so and tells
          you what to check. Dates that are neither - MPC meetings, which the
          RBI announces a year at a time - are not predicted at all, but read
          backwards out of the archive further down.
        </p>
      </header>

      <Section
        index="01"
        title="Next 90 days"
        accentVar="--cat-trade"
        note={`${count(ahead.length)} dates`}
        description="Ahead, soonest first."
      >
        <div className="flex flex-col gap-8">
          <StatRow>
            {next && (
              <StatTile
                label="Next up"
                value={relativeDay(next.date)}
                note={next.title}
              />
            )}
            <StatTile label="In 90 days" value={count(ahead.length)} note="Rule-derived dates ahead" />
            <StatTile
              label="Needing verification"
              value={count(unverified)}
              note="Convention or exchange policy, not statute"
              deltaTone={unverified > 0 ? "down" : "neutral"}
            />
            <StatTile
              label="Last 30 days"
              value={count(behind.length)}
              note="Dates just passed"
            />
            <StatTile
              label="Issues open or filed"
              value={count(open.length)}
              note="From the issuance desk, not the calendar"
            />
            <StatTile label="Kinds tracked" value={count(CALENDAR_KINDS.length)} note="Fiscal, tax, results, budget, policy, derivatives" />
          </StatRow>

          {ahead.length === 0 ? (
            <p className="text-[15px] text-[var(--text-muted)]">Nothing in the window.</p>
          ) : (
            <ul className="flex flex-col">
              {ahead.map((event) => (
                <EventLine key={event.key} event={event} />
              ))}
            </ul>
          )}
        </div>
      </Section>

      <Section
        index="02"
        title="What the archive knows"
        accentVar="--cat-trade"
        description="The two schedules no rule generates, read out of the coverage instead."
      >
        <div className="flex flex-col gap-6">
          <p className="measure text-[13.5px] leading-relaxed text-[var(--text-secondary)]">
            The Monetary Policy Committee meets roughly every two months, on
            dates the RBI publishes annually and occasionally moves. Rather than
            hardcode a schedule that would rot, the desk finds the most recent
            one the archive actually reported. Same for the Budget: the 1
            February convention is generated above, and what was really
            presented is below.
          </p>

          <div className="grid gap-x-10 gap-y-6 lg:grid-cols-2">
            <Anchor
              label="Last monetary policy story"
              colorVar="--cat-policy"
              anchor={anchors.lastPolicy}
              empty="No monetary policy coverage in the archive yet."
              note="The MPC's cadence is bi-monthly, so the next decision is due roughly two months after this."
            />
            <Anchor
              label="Last Budget story"
              colorVar="--cat-economy"
              anchor={anchors.lastBudget}
              empty="No Budget coverage in the archive yet."
              note="Presented on 1 February every year since 2017, but the date is the government's to set."
            />
          </div>

          {open.length > 0 && (
            <div>
              <p className="kicker mb-3 text-[10px] text-[var(--text-primary)]">
                Issues open or recently filed
              </p>
              <ul className="flex flex-col gap-2">
                {open.map((event) => (
                  <li key={event.id} className="flex items-baseline gap-3">
                    <span className="meta w-20 shrink-0 text-[10px]">
                      {timeAgo(new Date(event.publishedAt))}
                    </span>
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 text-[14px] leading-snug text-[var(--text-secondary)] underline-offset-4 hover:text-[var(--text-primary)] hover:underline"
                    >
                      {event.title}
                    </a>
                  </li>
                ))}
              </ul>
              <Link
                href="/issuance"
                className="mt-3 inline-block text-[13px] text-[var(--text-secondary)] underline underline-offset-2 hover:text-[var(--text-primary)]"
              >
                Open the issuance desk
              </Link>
            </div>
          )}
        </div>
      </Section>

      {behind.length > 0 && (
        <Section
          index="03"
          title="Just passed"
          accentVar="--cat-trade"
          note={`${count(behind.length)} dates`}
          description="The last 30 days, most recent first."
        >
          <ul className="flex flex-col">
            {behind.map((event) => (
              <EventLine key={event.key} event={event} past />
            ))}
          </ul>
        </Section>
      )}

      <Section
        index="04"
        title="How this is built"
        accentVar="--cat-trade"
        description="Which dates stand on their own, and which need checking."
      >
        <dl className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
          <Definition term="Rule">
            Derivable from statute or a published framework, and correct for any
            year without maintenance: the April-March fiscal year, the quarter
            ends, the four advance-tax instalments, and the 45- and 60-day
            results deadlines in SEBI&rsquo;s listing regulations.
          </Definition>
          <Definition term="Convention">
            What has happened every year but binds nobody - the Budget on 1
            February, the Economic Survey the day before. Generated, and marked.
          </Definition>
          <Definition term="Derivatives expiry">
            Generated from a single constant, because the expiry weekday is
            exchange policy and both exchanges have changed theirs in recent
            years, in different directions. Treat every expiry row here as a
            prompt to check with NSE or BSE, not as a confirmed date.
          </Definition>
          <Definition term="What is deliberately absent">
            MPC meeting dates, exchange trading holidays and regulator board
            meetings. All three are schedules rather than rules, all three move,
            and inventing them would put wrong dates on a page that has no way
            to notice. A licensed calendar feed is what fixes that.
          </Definition>
        </dl>
      </Section>
    </div>
  );
}

function EventLine({ event, past = false }: { event: CalendarEvent; past?: boolean }) {
  const meta = calendarKindMeta(event.kind);
  const days = daysAway(event.date);
  const imminent = !past && days <= 7;

  return (
    <li
      className="flex flex-col gap-1.5 border-b py-3 sm:flex-row sm:items-baseline sm:gap-4"
      style={{ borderColor: "var(--rule)" }}
    >
      <div className="flex shrink-0 items-center gap-2.5 sm:w-[13rem]">
        <span
          className="meta w-[5.5rem] shrink-0 text-[11px]"
          style={{ color: imminent ? "var(--text-primary)" : undefined }}
        >
          {shortDate(event.date)}
        </span>
        <KindBadge label={meta.label} colorVar={meta.colorVar} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-snug text-[var(--text-primary)]">
          {event.title}
          <span className="meta ml-2 text-[10px]">{relativeDay(event.date)}</span>
        </p>
        <p className="measure mt-0.5 text-[13px] leading-relaxed text-[var(--text-muted)]">
          {event.detail}
        </p>
        {event.verify && (
          <p
            className="mt-1.5 flex items-start gap-1.5 text-[12px] leading-snug"
            style={{ color: "var(--text-muted)" }}
          >
            <AlertTriangle
              className="mt-[2px] h-3 w-3 shrink-0"
              style={{ color: "var(--cat-geopolitics)" }}
              aria-hidden
            />
            <span>{event.verify}</span>
          </p>
        )}
      </div>

      <span className="kicker shrink-0 text-[9px] text-[var(--text-muted)] sm:w-20 sm:text-right">
        {event.basis === "rule" ? "Rule" : "Convention"}
      </span>
    </li>
  );
}

function Anchor({
  label,
  colorVar,
  anchor,
  empty,
  note,
}: {
  label: string;
  colorVar: string;
  anchor: CalendarAnchor | null;
  empty: string;
  note: string;
}) {
  return (
    <div className="border-l-2 pl-3.5" style={{ borderColor: `var(${colorVar})` }}>
      <p className="kicker text-[10px]" style={{ color: `var(${colorVar})` }}>
        {label}
      </p>
      {anchor ? (
        <>
          <p className="meta mt-1.5 text-[11px]">
            {shortDate(new Date(anchor.publishedAt))} ·{" "}
            {timeAgo(new Date(anchor.publishedAt))}
          </p>
          <a
            href={anchor.url}
            target="_blank"
            rel="noopener noreferrer"
            className="headline-tight mt-1 block text-[16px] text-[var(--text-primary)] underline-offset-4 hover:underline"
          >
            {anchor.title}
          </a>
          <p className="meta mt-1 text-[10px]">{anchor.sourceName}</p>
        </>
      ) : (
        <p className="mt-1.5 text-[14px] text-[var(--text-muted)]">{empty}</p>
      )}
      <p className="measure mt-2.5 text-[12.5px] leading-relaxed text-[var(--text-muted)]">{note}</p>
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
