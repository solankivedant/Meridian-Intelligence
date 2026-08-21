import Link from "next/link";
import { Region } from "@/lib/enums";
import { safeQuery } from "@/lib/safeQuery";
import { searchArticles, isMatchMode, MATCH_MODES, MAX_QUERY_LENGTH, type MatchMode } from "@/lib/search";
import { metaForSlug, CATEGORY_META } from "@/lib/categoryMeta";
import { Section } from "@/components/Section";
import { ArticleGrid } from "@/components/ArticleGrid";
import { highlightTerms } from "@/components/Highlight";
import { Pagination } from "@/components/Pagination";
import { SectionIcon } from "@/components/MetaIcon";
import { PAGE_SIZE, PHONE_PAGE_SIZE } from "@/lib/feedQuery";
import { isPhoneRequest } from "@/lib/viewport";

export const revalidate = 0;

type SearchPageParams = {
  q?: string;
  region?: string;
  category?: string;
  page?: string;
  /** How the words relate: all of them, any of them, or as a phrase. */
  match?: string;
};

function parseRegion(value: string | undefined): Region | undefined {
  if (value === "india") return Region.INDIA;
  if (value === "world") return Region.WORLD;
  return undefined;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchPageParams>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").slice(0, MAX_QUERY_LENGTH).trim();
  const region = parseRegion(params.region);
  const categoryMeta = params.category ? metaForSlug(params.category) : undefined;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const match: MatchMode = isMatchMode(params.match) ? params.match : "all";
  // The same words the query was built from, so what is marked in the results
  // is what was actually matched against.
  const terms = highlightTerms(query);
  // Same reasoning as the feed: forty results is a page on a laptop and a pit
  // on a phone.
  const pageSize = (await isPhoneRequest()) ? PHONE_PAGE_SIZE : PAGE_SIZE;

  const { articles, total } = query
    ? await safeQuery(
        () =>
          searchArticles(
            query,
            { region, category: categoryMeta?.category },
            { skip: (page - 1) * pageSize, take: pageSize, mode: match }
          ),
        { articles: [], total: 0 }
      )
    : { articles: [], total: 0 };

  const scopeHref = (next: Partial<SearchPageParams>) => {
    const search = new URLSearchParams({ q: query });
    const nextRegion = next.region ?? params.region;
    const nextCategory = next.category ?? params.category;
    const nextMatch = next.match ?? params.match;
    if (nextRegion) search.set("region", nextRegion);
    if (nextCategory) search.set("category", nextCategory);
    // `all` is the default, so it stays out of the URL - two routes to the
    // same results should produce the same link.
    if (nextMatch && nextMatch !== "all") search.set("match", nextMatch);
    return `/search?${search.toString()}`;
  };

  return (
    <div className="flex flex-col gap-8 pt-6">
      <header className="border-b pb-6" style={{ borderColor: "var(--rule-strong)" }}>
        <span className="kicker text-[var(--text-muted)]">Search</span>
        <h1 className="headline mt-2 text-[30px] leading-[1.08] text-[var(--text-primary)] sm:text-[40px]">
          {query ? <>Results for &ldquo;{query}&rdquo;</> : "Search the archive"}
        </h1>

        <form action="/search" method="GET" className="mt-5 flex max-w-xl items-center gap-2">
          {region && <input type="hidden" name="region" value={params.region} />}
          {categoryMeta && <input type="hidden" name="category" value={params.category} />}
          {match !== "all" && <input type="hidden" name="match" value={match} />}
          <input
            type="search"
            name="q"
            defaultValue={query}
            autoFocus
            placeholder="Headline or excerpt - e.g. semiconductor incentive"
            maxLength={MAX_QUERY_LENGTH}
            aria-label="Search the archive"
            className="min-w-0 flex-1 border-b bg-transparent py-1.5 text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--text-primary)]"
            style={{ borderColor: "var(--rule-strong)" }}
          />
          <button
            type="submit"
            className="kicker shrink-0 px-3 py-1.5 text-white"
            style={{ backgroundColor: "var(--cat-policy)" }}
          >
            Search
          </button>
        </form>

        {query && (
          <div className="mt-5 flex flex-col gap-2">
            {/* Above the two scope rows on purpose: those narrow a set of
                results, this decides what counts as one. */}
            <ScopeRow label="Match">
              {MATCH_MODES.map((option) => (
                <Chip
                  key={option.key}
                  href={scopeHref({ match: option.key })}
                  active={match === option.key}
                  title={option.hint}
                >
                  {option.label}
                </Chip>
              ))}
            </ScopeRow>
            <ScopeRow label="Desk">
              <Chip href={scopeHref({ region: "" })} active={!region}>
                Both
              </Chip>
              <Chip href={scopeHref({ region: "india" })} active={region === Region.INDIA}>
                India
              </Chip>
              <Chip href={scopeHref({ region: "world" })} active={region === Region.WORLD}>
                World
              </Chip>
            </ScopeRow>
            <ScopeRow label="Section">
              <Chip href={scopeHref({ category: "" })} active={!categoryMeta}>
                All
              </Chip>
              {CATEGORY_META.map((meta) => (
                <Chip
                  key={meta.slug}
                  href={scopeHref({ category: meta.slug })}
                  active={categoryMeta?.slug === meta.slug}
                  color={`var(${meta.colorVar})`}
                >
                  <SectionIcon meta={meta} size="xs" />
                  {meta.shortLabel}
                </Chip>
              ))}
            </ScopeRow>
          </div>
        )}
      </header>

      {!query ? (
        <p className="measure text-[15px] leading-relaxed text-[var(--text-secondary)]">
          Search runs over every stored headline and excerpt across both desks.
          Partial words match, so <span className="meta">semicon</span> finds
          semiconductor. By default every word you type must appear somewhere in
          the story - once you have results you can switch to any word for a
          wider net, or to an exact phrase to require the words together and in
          order.
        </p>
      ) : (
        <Section
          index="01"
          title={total > 0 ? "Matches" : "No matches"}
          note={total > 0 ? `${total.toLocaleString("en-IN")} stories` : undefined}
          description={
            total > 0
              ? "Ranked by relevance, then recency."
              : match === "exact"
                ? "Nothing carries that phrase. Try All words, which finds them anywhere in a story."
                : "Try fewer words, Any word, or widen the desk and section filters above."
          }
        >
          <ArticleGrid
            articles={articles}
            startIndex={(page - 1) * pageSize + 1}
            highlight={{ text: terms }}
          />
          <Pagination
            basePath="/search"
            params={{}}
            extra={{
              q: query,
              region: params.region,
              category: params.category,
              match: match === "all" ? undefined : match,
            }}
            page={page}
            pageSize={pageSize}
            total={total}
          />
        </Section>
      )}
    </div>
  );
}

function ScopeRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="kicker w-16 shrink-0 text-[10px] text-[var(--text-muted)]">{label}</span>
      {children}
    </div>
  );
}

function Chip({
  href,
  active,
  color,
  title,
  children,
}: {
  href: string;
  active: boolean;
  color?: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      title={title}
      aria-current={active ? "true" : undefined}
      className="inline-flex items-center gap-1.5 border px-2 py-0.5 text-[11px] transition-colors"
      style={
        active
          ? {
              borderColor: color ?? "var(--text-primary)",
              backgroundColor: color
                ? `color-mix(in srgb, ${color} 15%, var(--surface-1))`
                : "var(--text-primary)",
              color: color ?? "var(--surface-1)",
              fontWeight: 600,
            }
          : { borderColor: "var(--rule)", color: "var(--text-secondary)" }
      }
    >
      {children}
    </Link>
  );
}
