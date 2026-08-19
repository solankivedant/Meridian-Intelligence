import { Prisma } from "@prisma/client";
import { Category, Region } from "@/lib/enums";
import { TAG_META } from "@/lib/categorize";
import { CATEGORY_META, metaForSlug } from "@/lib/categoryMeta";
import { normalizeRange, rangeCutoff, isValidMonthKey, monthDateRange, TimeRangeKey } from "@/lib/timeRange";

/** Stories per page. Kept modest so a page is scannable end to end. */
export const PAGE_SIZE = 40;

export type FeedSearchParams = {
  range?: string;
  /** Comma-separated sector keys. */
  tags?: string;
  /** Single sector key - the pre-multi-select parameter, still honoured. */
  tag?: string;
  /** Comma-separated section slugs, e.g. `policy-regulatory,investment-fdi`. */
  cats?: string;
  sort?: string;
  month?: string;
  page?: string;
  q?: string;
};

export type ParsedFeedParams = {
  range: TimeRangeKey;
  tags: string[];
  cats: Category[];
  sort: SortKey;
  month: string;
  page: number;
};

/**
 * How the feed is ordered.
 *
 * "Newest first" is the only order a news archive needs most days, but two
 * others earn their place: reading a window forwards (what happened, in the
 * order it happened) and reading it section by section, which is what the
 * pulse invites - you look at the day's skew, then want the busiest section's
 * stories together rather than interleaved with everything else.
 */
export type SortKey = "new" | "old" | "section";

export const SORTS: { key: SortKey; label: string; hint: string }[] = [
  { key: "new", label: "Newest", hint: "Most recent first" },
  { key: "old", label: "Oldest", hint: "Read the window forwards" },
  { key: "section", label: "By section", hint: "Grouped by section, newest within each" },
];

const KNOWN_TAGS = new Set(TAG_META.map((t) => t.key));
const CATEGORY_SLUGS = new Map(CATEGORY_META.map((meta) => [meta.slug, meta.category]));

function isSortKey(value: string | undefined): value is SortKey {
  return SORTS.some((sort) => sort.key === value);
}

/** Section slugs back to enum members, order and duplicates normalised. */
export function parseCategorySlugs(raw: string | undefined): Category[] {
  const wanted = new Set(
    (raw ?? "")
      .split(",")
      .map((slug) => slug.trim())
      .filter((slug) => CATEGORY_SLUGS.has(slug))
  );
  // Rebuilt from CATEGORY_META so the parameter is canonical whatever order it
  // was typed in - two links selecting the same sections produce one URL.
  return CATEGORY_META.filter((meta) => wanted.has(meta.slug)).map((meta) => meta.category);
}

/** The slugs for a set of sections, for building links back. */
export function categorySlugs(cats: Category[]): string[] {
  return CATEGORY_META.filter((meta) => cats.includes(meta.category)).map((meta) => meta.slug);
}

export function parseFeedParams(params: FeedSearchParams): ParsedFeedParams {
  // `tag` (singular) predates multi-select; old links and bookmarks still work.
  const raw = [...(params.tags ?? "").split(","), params.tag ?? ""];
  const tags = [...new Set(raw.map((t) => t.trim()).filter((t) => KNOWN_TAGS.has(t)))];

  return {
    range: normalizeRange(params.range),
    tags,
    cats: parseCategorySlugs(params.cats),
    sort: isSortKey(params.sort) ? params.sort : "new",
    month: isValidMonthKey(params.month) ? params.month : "",
    page: Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1),
  };
}

/** True when the reader has narrowed the feed beyond its defaults. */
export function isNarrowed(parsed: ParsedFeedParams): boolean {
  return (
    parsed.tags.length > 0 ||
    parsed.cats.length > 0 ||
    // A re-ordered feed counts as narrowed too: "the lead" and the day
    // grouping both assume newest-first and read as broken without it.
    parsed.sort !== "new" ||
    parsed.month !== "" ||
    parsed.range !== "7d"
  );
}

export function buildFeedWhere(
  parsed: ParsedFeedParams,
  scope: { region?: Region; category?: Category } = {}
): Prisma.ArticleWhereInput {
  const cutoff = rangeCutoff(parsed.range);

  return {
    ...(scope.region ? { region: scope.region } : {}),
    // A section page is already scoped to one section, so the reader's own
    // section picks have nothing left to narrow and are ignored there.
    ...(scope.category
      ? { category: scope.category }
      : parsed.cats.length
        ? { category: { in: parsed.cats } }
        : {}),
    // Browsing a specific month overrides the relative range entirely.
    ...(parsed.month
      ? { publishedAt: monthDateRange(parsed.month) }
      : cutoff
        ? { publishedAt: { gte: cutoff } }
        : {}),
    // Multiple sectors read as "any of these", which is what a reader picking
    // several related industries expects.
    ...(parsed.tags.length ? { tags: { hasSome: parsed.tags } } : {}),
  };
}

/** The order clause for a parsed feed request. */
export function feedOrderBy(parsed: ParsedFeedParams): Prisma.ArticleOrderByWithRelationInput[] {
  switch (parsed.sort) {
    case "old":
      return [{ publishedAt: "asc" }];
    case "section":
      // Postgres orders an enum by its declaration order, which is the palette
      // order the whole site is built on - so "by section" comes out in the
      // same sequence as the pulse, the drawer and the footer.
      return [{ category: "asc" }, { publishedAt: "desc" }];
    default:
      return [{ publishedAt: "desc" }];
  }
}

/**
 * The slice of the feed a page should fetch.
 *
 * The unfiltered first page lifts one story out of the feed and gives it the
 * lead treatment, so fetching a flat `PAGE_SIZE` left the grid one story short
 * - 39 tiles where the pager promised 40. It takes one extra row instead, and
 * every later page skips that row so the lifted story is not served twice.
 */
export function feedSlice(parsed: ParsedFeedParams): { skip: number; take: number } {
  // A narrowed view has no lead panel, so nothing is lifted out of it.
  const liftsLead = !isNarrowed(parsed);
  return {
    skip: (parsed.page - 1) * PAGE_SIZE + (liftsLead && parsed.page > 1 ? 1 : 0),
    take: liftsLead && parsed.page === 1 ? PAGE_SIZE + 1 : PAGE_SIZE,
  };
}

/** The parts of a feed URL any control may want to rewrite. */
export type FeedHrefParts = {
  range?: string;
  tags?: string[];
  cats?: Category[];
  sort?: SortKey;
  month?: string;
};

/**
 * A feed URL.
 *
 * Every control that narrows the feed - the period buttons, the section and
 * sector chips, the sort, and the pulse's own meters - routes through here, so
 * changing one facet provably preserves the rest. Defaults are omitted, which
 * keeps the everyday URL short and makes two routes to the same view produce
 * the same link.
 */
export function feedHref(basePath: string, parts: FeedHrefParts): string {
  const search = new URLSearchParams();
  if (parts.range) search.set("range", parts.range);
  if (parts.tags?.length) search.set("tags", parts.tags.join(","));
  if (parts.cats?.length) search.set("cats", categorySlugs(parts.cats).join(","));
  if (parts.sort && parts.sort !== "new") search.set("sort", parts.sort);
  if (parts.month) search.set("month", parts.month);
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** Query-string values to carry across pagination links. */
export function feedLinkParams(parsed: ParsedFeedParams) {
  return {
    range: parsed.range,
    tags: parsed.tags.join(","),
    cats: categorySlugs(parsed.cats).join(","),
    sort: parsed.sort === "new" ? "" : parsed.sort,
    month: parsed.month,
  };
}
