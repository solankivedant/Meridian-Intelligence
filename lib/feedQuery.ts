import { Category, Prisma, Region } from "@prisma/client";
import { TAG_META } from "@/lib/categorize";
import { normalizeRange, rangeCutoff, isValidMonthKey, monthDateRange, TimeRangeKey } from "@/lib/timeRange";

/** Stories per page. Kept modest so a page is scannable end to end. */
export const PAGE_SIZE = 40;

export type FeedSearchParams = {
  range?: string;
  /** Comma-separated sector keys. */
  tags?: string;
  /** Single sector key — the pre-multi-select parameter, still honoured. */
  tag?: string;
  month?: string;
  page?: string;
  q?: string;
};

export type ParsedFeedParams = {
  range: TimeRangeKey;
  tags: string[];
  month: string;
  page: number;
};

const KNOWN_TAGS = new Set(TAG_META.map((t) => t.key));

export function parseFeedParams(params: FeedSearchParams): ParsedFeedParams {
  // `tag` (singular) predates multi-select; old links and bookmarks still work.
  const raw = [...(params.tags ?? "").split(","), params.tag ?? ""];
  const tags = [...new Set(raw.map((t) => t.trim()).filter((t) => KNOWN_TAGS.has(t)))];

  return {
    range: normalizeRange(params.range),
    tags,
    month: isValidMonthKey(params.month) ? params.month : "",
    page: Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1),
  };
}

/** True when the reader has narrowed the feed beyond its defaults. */
export function isNarrowed(parsed: ParsedFeedParams): boolean {
  return parsed.tags.length > 0 || parsed.month !== "" || parsed.range !== "7d";
}

export function buildFeedWhere(
  parsed: ParsedFeedParams,
  scope: { region?: Region; category?: Category } = {}
): Prisma.ArticleWhereInput {
  const cutoff = rangeCutoff(parsed.range);

  return {
    ...(scope.region ? { region: scope.region } : {}),
    ...(scope.category ? { category: scope.category } : {}),
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

/** Query-string values to carry across pagination links. */
export function feedLinkParams(parsed: ParsedFeedParams) {
  return {
    range: parsed.range,
    tags: parsed.tags.join(","),
    month: parsed.month,
  };
}
