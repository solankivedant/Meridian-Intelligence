import { db } from "@/lib/db";
import { safeQuery } from "@/lib/safeQuery";
import {
  CONFIGURED_SOURCE_NAMES,
  RSS_SOURCES,
  NEWSDATA_SOURCE,
} from "@/lib/ingestion/sources";
import { metaForCategory } from "@/lib/categoryMeta";
import { SectionHeading } from "@/components/SectionHeading";

export const revalidate = 0;

type SourceRow = {
  id: string;
  name: string;
  url: string;
  defaultCategory: Parameters<typeof metaForCategory>[0];
  _count: { articles: number };
};

export default async function SourcesPage() {
  const sources = await safeQuery<SourceRow[]>(
    () =>
      db.source.findMany({
        include: { _count: { select: { articles: true } } },
        orderBy: [{ name: "asc" }],
      }),
    []
  );

  // Feeds this app polls directly are a curated, auditable list; publishers
  // reached through the Google News archive crawl accumulate on their own, so
  // the two are listed separately rather than in one undifferentiated table.
  //
  // The direct list is built from config, not from the database, so a feed
  // that has been added but not yet polled still shows up — at zero.
  const storedByName = new Map(sources.map((s) => [s.name, s]));
  const configured: SourceRow[] = [...RSS_SOURCES, NEWSDATA_SOURCE]
    .map((config) => ({
      id: config.name,
      name: config.name,
      url: config.url,
      defaultCategory: config.defaultCategory,
      _count: { articles: storedByName.get(config.name)?._count.articles ?? 0 },
    }))
    .sort((a, b) => b._count.articles - a._count.articles);

  const discovered = sources
    .filter((s) => !CONFIGURED_SOURCE_NAMES.has(s.name))
    .sort((a, b) => b._count.articles - a._count.articles);

  const totalArticles = sources.reduce((sum, s) => sum + s._count.articles, 0);

  return (
    <div className="flex flex-col gap-12 pt-8">
      <header className="border-b pb-6" style={{ borderColor: "var(--rule-strong)" }}>
        <span className="kicker text-[var(--text-muted)]">Provenance</span>
        <h1 className="headline mt-2 text-[32px] leading-[1.08] text-[var(--text-primary)] sm:text-[44px]">
          Where this comes from
        </h1>
        <p className="measure mt-3 text-[15px] leading-[1.65] text-[var(--text-secondary)]">
          Every item on this dashboard is a headline, a short excerpt, and a link
          back to the publisher — full article text is never stored. Categories
          are assigned on ingest by a keyword rule set, so an item&apos;s section
          may differ from the feed&apos;s default.
        </p>
        <p className="meta mt-4">
          {sources.length.toLocaleString("en-IN")} sources ·{" "}
          {totalArticles.toLocaleString("en-IN")} stories
        </p>
      </header>

      <section>
        <SectionHeading
          title="Direct feeds"
          note={`${configured.length} feeds, polled on every ingest run`}
        />
        <SourceTable rows={configured} linkOut />
      </section>

      {discovered.length > 0 && (
        <section>
          <SectionHeading
            title="Publishers via the news archive"
            note={`${discovered.length.toLocaleString("en-IN")} outlets`}
          />
          <p className="measure mb-5 text-[14px] leading-relaxed text-[var(--text-secondary)]">
            The historical crawl queries a dated news archive rather than a fixed
            feed list, so these outlets appear because they published something
            matching one of the dashboard&apos;s topics — not because they were
            configured here.
          </p>
          <SourceTable rows={discovered} />
        </section>
      )}
    </div>
  );
}

function SourceTable({ rows, linkOut = false }: { rows: SourceRow[]; linkOut?: boolean }) {
  if (rows.length === 0) {
    return (
      <p className="text-[14px] text-[var(--text-muted)]">
        Nothing recorded yet — run an ingest to populate this list.
      </p>
    );
  }

  return (
    <ul className="border-t" style={{ borderColor: "var(--rule)" }}>
      {rows.map((source) => {
        const meta = metaForCategory(source.defaultCategory);
        return (
          <li
            key={source.id}
            className="flex items-baseline gap-4 border-b py-2.5"
            style={{ borderColor: "var(--rule)" }}
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: `var(${meta.colorVar})` }}
              title={meta.label}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--text-primary)]">
              {linkOut ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-offset-2 hover:underline"
                >
                  {source.name}
                </a>
              ) : (
                source.name
              )}
            </span>
            <span className="meta shrink-0">{source._count.articles.toLocaleString("en-IN")}</span>
          </li>
        );
      })}
    </ul>
  );
}
