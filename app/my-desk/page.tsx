import { Suspense } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Region } from "@/lib/enums";
import { safeQuery } from "@/lib/safeQuery";
import { Section } from "@/components/Section";
import { ArticleGrid } from "@/components/ArticleGrid";
import { TopicForm, DESK_OPTIONS, MAX_TOPIC_LENGTH } from "@/components/TopicForm";
import { FeedSkeleton, TextSkeleton } from "@/components/Skeleton";
import { buildTopicBrief, TopicBrief } from "@/lib/topicBrief";
import { isTimeRangeKey, TimeRangeKey } from "@/lib/timeRange";
import { timeAgo } from "@/lib/formatTime";

export const revalidate = 0;

// The Gemini call is allowed two 30s attempts; the platform default of 10s
// would kill the request before the first one returned.
export const maxDuration = 60;

/** A topic is a phrase, not a query language - anything longer is a paste. */
const DEFAULT_RANGE: TimeRangeKey = "1m";

// Shown on the empty desk. Chosen to demonstrate the range of what works: a
// sector, a scheme, an instrument, a bilateral relationship.
const EXAMPLES = [
  "semiconductor fab incentives",
  "EV battery manufacturing",
  "RBI repo rate and inflation",
  "India US trade tariffs",
  "startup funding and IPOs",
  "solar and green hydrogen",
];

type DeskParams = {
  topic?: string;
  range?: string;
  desk?: string;
};

function parseDesk(value: string | undefined): { key: string; region?: Region } {
  const option = DESK_OPTIONS.find((d) => d.key === value);
  return option ?? DESK_OPTIONS[0];
}

export default async function MyDeskPage({
  searchParams,
}: {
  searchParams: Promise<DeskParams>;
}) {
  const params = await searchParams;
  const topic = (params.topic ?? "").slice(0, MAX_TOPIC_LENGTH).trim();
  const range = isTimeRangeKey(params.range) ? params.range : DEFAULT_RANGE;
  const desk = parseDesk(params.desk);

  return (
    <div className="flex flex-col gap-8 pt-6">
      <header className="border-b pb-6" style={{ borderColor: "var(--rule-strong)" }}>
        <span className="kicker flex items-center gap-1.5 text-[var(--cat-tech)]">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Personalised · Gemini
        </span>
        <h1 className="headline mt-2 text-[32px] leading-[1.06] text-[var(--text-primary)] sm:text-[46px]">
          Your desk
        </h1>
        <p className="measure mt-3 text-[15px] leading-relaxed text-[var(--text-secondary)]">
          Name a topic you follow. Every story the archive holds on it is pulled,
          read by Gemini, stripped of routine filings and duplicates, and returned
          ranked by what actually matters - each with a line on why it is there.
        </p>

        <TopicForm topic={topic} range={range} desk={desk.key} />
      </header>

      {topic ? (
        // Keyed on the request so a new topic shows the skeleton again rather
        // than holding the previous desk on screen while the model works.
        <Suspense key={`${topic}|${range}|${desk.key}`} fallback={<DeskPending topic={topic} />}>
          <TopicDesk topic={topic} range={range} region={desk.region} />
        </Suspense>
      ) : (
        <Section
          index="01"
          title="Start with a topic"
          description="A sector, a scheme, an instrument, a relationship - anything the archive covers."
          accentVar="--cat-tech"
        >
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <Link
                key={example}
                href={`/my-desk?topic=${encodeURIComponent(example)}`}
                className="border px-3 py-1.5 text-[13px] text-[var(--text-secondary)] transition-colors hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]"
                style={{ borderColor: "var(--rule-strong)" }}
              >
                {example}
              </Link>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

/**
 * The desk itself: a written read, the ranked picks, then everything else the
 * topic matched. Rendered inside Suspense, so the page and its form are on
 * screen while this waits on the model.
 */
async function TopicDesk({
  topic,
  range,
  region,
}: {
  topic: string;
  range: TimeRangeKey;
  region?: Region;
}) {
  const brief = await safeQuery(() => buildTopicBrief({ topic, range, region }), null);

  if (!brief || brief.candidates === 0) {
    return (
      <Section index="01" title="Nothing on this topic yet" accentVar="--cat-tech">
        <p className="measure text-[15px] leading-relaxed text-[var(--text-secondary)]">
          The archive has no stories matching <strong>{topic}</strong> in this
          window. Try a wider window, fewer words, or the words a headline would
          actually use - <span className="meta">customs duty</span> rather than{" "}
          <span className="meta">import taxes going up</span>.
        </p>
      </Section>
    );
  }

  const annotations = Object.fromEntries(
    brief.picks.filter((pick) => pick.note).map((pick) => [pick.article.id, pick.note])
  );

  let section = 0;
  const next = () => String(++section).padStart(2, "0");

  return (
    <>
      {brief.overview && (
        <Section
          index={next()}
          title="The read"
          note={brief.model ? `written by ${brief.model}` : undefined}
          description={`Drawn only from the ${brief.candidates} stories this topic matched.`}
          accentVar="--cat-tech"
        >
          <TopicRead brief={brief} />
        </Section>
      )}

      <Section
        index={next()}
        title="Your headlines"
        note={`${brief.picks.length} of ${brief.candidates}`}
        description={
          brief.degraded === "none"
            ? "Ranked by importance to your topic, not by time. Routine filings and duplicates are dropped."
            : "Ranked by keyword relevance. The written read and the editing pass are unavailable."
        }
        accentVar="--cat-tech"
      >
        {brief.degraded !== "none" && <DegradedNotice reason={brief.degraded} />}
        <ArticleGrid articles={brief.picks.map((p) => p.article)} startIndex={1} annotations={annotations} />
      </Section>

      {brief.rest.length > 0 && (
        <Section
          index={next()}
          title="Also matched"
          note={`${brief.rest.length} stories`}
          description="Relevant to the topic, but not picked out. Most relevant first."
          accentVar="--cat-tech"
        >
          <ArticleGrid articles={brief.rest} startIndex={brief.picks.length + 1} />
        </Section>
      )}
    </>
  );
}

/** The overview, with the threads the model found running under it. */
function TopicRead({ brief }: { brief: TopicBrief }) {
  return (
    <div className="grid gap-x-10 gap-y-5 lg:grid-cols-12">
      <p className="self-start text-[18px] leading-[1.62] text-[var(--text-primary)] lg:col-span-8">
        {brief.overview}
      </p>

      <div
        className="self-start lg:col-span-4 lg:border-l lg:pl-10"
        style={{ borderColor: "var(--rule)" }}
      >
        {brief.themes.length > 0 && (
          <>
            <p className="kicker mb-2 text-[10px] text-[var(--text-muted)]">Running threads</p>
            <div className="flex flex-wrap gap-1.5">
              {brief.themes.map((theme) => (
                <span
                  key={theme}
                  className="border px-2 py-0.5 text-[12px] text-[var(--text-secondary)]"
                  style={{ borderColor: "var(--rule-strong)" }}
                >
                  {theme}
                </span>
              ))}
            </div>
          </>
        )}
        <p className="meta mt-3">read built {timeAgo(brief.generatedAt)}</p>
      </div>
    </div>
  );
}

function DegradedNotice({ reason }: { reason: "unconfigured" | "failed" }) {
  return (
    <p
      className="mb-4 border-l-2 py-1 pl-3 text-[13px] leading-relaxed text-[var(--text-secondary)]"
      style={{ borderColor: "var(--cat-geopolitics)" }}
    >
      {reason === "unconfigured"
        ? "Gemini is not configured on this deployment (GEMINI_API_KEY is unset), so these stories are ranked by keyword relevance alone."
        : "Gemini could not be reached, so these stories are ranked by keyword relevance alone. Re-running the topic usually clears it."}
    </p>
  );
}

/** What the reader looks at while the model reads. */
function DeskPending({ topic }: { topic: string }) {
  return (
    <Section
      index="01"
      title="Reading the archive"
      note="working"
      description={`Gathering and ranking everything filed on ${topic}.`}
      accentVar="--cat-tech"
    >
      {/* The model takes tens of seconds. The wait is shaped like the answer
          - a written read, then ranked tiles - so nothing moves when it lands. */}
      <div className="flex flex-col gap-6">
        <div className="animate-pulse">
          <TextSkeleton lines={3} />
        </div>
        <FeedSkeleton cards={6} />
      </div>
    </Section>
  );
}
