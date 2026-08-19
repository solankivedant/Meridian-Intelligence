import { db } from "@/lib/db";
import { safeQuery } from "@/lib/safeQuery";
import { Category, Region } from "@/lib/enums";
import {
  CONFIGURED_SOURCE_NAMES,
  ALL_CONFIGURED_SOURCES,
} from "@/lib/ingestion/sources";
import { CATEGORY_META } from "@/lib/categoryMeta";
import { Section } from "@/components/Section";
import { SourceDirectory } from "@/components/SourceDirectory";
import type { SourceEntry } from "@/components/SourceList";

export const revalidate = 0;

type StoredSource = {
  name: string;
  defaultCategory: Category;
  region: Region;
  _count: { articles: number };
};

export default async function SourcesPage() {
  const sources = await safeQuery<StoredSource[]>(
    () =>
      db.source.findMany({
        select: {
          name: true,
          defaultCategory: true,
          region: true,
          _count: { select: { articles: true } },
        },
        orderBy: [{ name: "asc" }],
      }),
    []
  );

  // Feeds this app polls directly are a curated, auditable list; publishers
  // reached through the Google News archive crawl accumulate on their own, so
  // the two are listed separately rather than in one undifferentiated table.
  //
  // The direct list is built from config, not from the database, so a feed
  // that has been added but not yet polled still shows up - at zero.
  const storedByName = new Map(sources.map((s) => [s.name, s]));
  const configured: SourceEntry[] = ALL_CONFIGURED_SOURCES.map((config) => ({
    id: config.name,
    name: config.name,
    url: config.url,
    category: config.defaultCategory,
    count: storedByName.get(config.name)?._count.articles ?? 0,
  })).sort((a, b) => b.count - a.count);

  const configuredRegion = new Map(ALL_CONFIGURED_SOURCES.map((s) => [s.name, s.region]));
  const byDesk = (region: Region) =>
    configured.filter((s) => configuredRegion.get(s.name) === region);

  const discovered: SourceEntry[] = sources
    .filter((s) => !CONFIGURED_SOURCE_NAMES.has(s.name))
    // No `url`: these are not linked out, and a thousand unused strings is
    // payload the client would download for nothing.
    .map((s) => ({
      id: s.name,
      name: s.name,
      category: s.defaultCategory,
      count: s._count.articles,
    }))
    .sort((a, b) => b.count - a.count);

  const totalArticles = sources.reduce((sum, s) => sum + s._count.articles, 0);
  const india = byDesk(Region.INDIA);
  const world = byDesk(Region.WORLD);

  // The three source lists share one search field, so they are numbered here
  // and drawn together; the walkthrough below carries on from wherever they
  // stopped.
  const lists = [india, world, discovered].filter((rows) => rows.length > 0).length;

  return (
    <div className="flex flex-col gap-8 pt-6">
      <header className="border-b pb-6" style={{ borderColor: "var(--rule-strong)" }}>
        <span className="kicker text-[var(--text-muted)]">Provenance</span>
        <h1 className="headline mt-2 text-[32px] leading-[1.06] text-[var(--text-primary)] sm:text-[46px]">
          Where this comes from
        </h1>
        <p className="measure mt-3 text-[15px] leading-[1.65] text-[var(--text-secondary)]">
          Every item on this dashboard is a headline, a short excerpt, and a link
          back to the publisher - full article text is never stored. Categories
          are assigned on ingest by a keyword rule set, so an item&apos;s section
          may differ from the feed&apos;s default.
        </p>

        <div
          className="mt-5 flex flex-wrap gap-x-8 gap-y-3 border-t pt-4"
          style={{ borderColor: "var(--rule)" }}
        >
          <Stat value={ALL_CONFIGURED_SOURCES.length} label="feeds polled directly" />
          <Stat value={discovered.length} label="publishers via the archive" />
          <Stat value={sources.length} label="sources on record" />
          <Stat value={totalArticles} label="stories held" />
        </div>
      </header>

      <SourceDirectory india={india} world={world} discovered={discovered} startIndex={1} />

      <Section
        index={String(lists + 1).padStart(2, "0")}
        title="How a story gets here"
        description="The same four steps run on every ingest, whether an item came from a configured feed or the archive crawl."
      >
        <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2 xl:grid-cols-4">
          <Step
            n="1"
            title="Collect"
            body="Configured RSS feeds are polled on a daily ingest run. A weekly crawl walks a dated news archive for the dashboard's standing topics, which is where the long tail of publishers below comes from."
          />
          <Step
            n="2"
            title="De-duplicate"
            body="Syndicated copy arrives under many URLs, so a normalised headline is compared as well as the link. The first version to arrive is the one kept."
          />
          <Step
            n="3"
            title="Categorise"
            body="An ordered keyword rule set assigns one of the eight sections, narrower rules first. Only when nothing matches does the feed's own default apply."
          />
          <Step
            n="4"
            title="Store the pointer"
            body="Headline, excerpt, publisher, timestamp and link. Nothing is rewritten and no article body is copied - every item opens at its publisher."
          />
        </div>

        <div
          className="mt-8 border-t pt-4"
          style={{ borderColor: "var(--rule)" }}
        >
          <p className="kicker mb-2.5 text-[10px] text-[var(--text-muted)]">
            The eight sections, and their colours
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            {CATEGORY_META.map((meta) => (
              <span key={meta.slug} className="flex items-center gap-1.5 text-[13px]">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: `var(${meta.colorVar})` }}
                  aria-hidden
                />
                <span className="text-[var(--text-secondary)]">{meta.label}</span>
              </span>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <span className="flex items-baseline gap-2">
      <span className="text-[20px] font-medium tabular-nums text-[var(--text-primary)]">
        {value.toLocaleString("en-IN")}
      </span>
      <span className="kicker text-[10px] text-[var(--text-muted)]">{label}</span>
    </span>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="meta text-[11px] text-[var(--text-muted)]">{n}</span>
        <h3 className="headline text-[17px] text-[var(--text-primary)]">{title}</h3>
      </div>
      <p className="mt-1.5 text-[13.5px] leading-[1.6] text-[var(--text-secondary)]">{body}</p>
    </div>
  );
}
