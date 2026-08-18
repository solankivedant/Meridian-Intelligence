import { Region } from "@/lib/enums";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";

// Epoch milliseconds rather than Date objects: the cache below round-trips its
// payload through serialization, which turns a Date into a string and makes
// every cache *hit* throw where the miss worked fine. Numbers survive intact.
export type Coverage = {
  stories: number;
  sources: number;
  oldestAt: number | null;
  updatedAt: number | null;
};

/**
 * Archive-wide totals for the masthead strip.
 *
 * These scan the whole table and are identical for every reader, so they are
 * cached rather than recomputed on each request — with tens of thousands of
 * rows they were the slowest part of rendering a page whose actual content is
 * one indexed forty-row query.
 */
export const getCoverage = unstable_cache(
  async (region: Region): Promise<Coverage> => {
    const [articles, sources] = await Promise.all([
      db.article.aggregate({
        where: { region },
        _count: { _all: true },
        _min: { publishedAt: true },
        _max: { fetchedAt: true },
      }),
      db.source.count({ where: { region } }),
    ]);

    return {
      stories: articles._count._all,
      sources,
      oldestAt: articles._min.publishedAt?.getTime() ?? null,
      updatedAt: articles._max.fetchedAt?.getTime() ?? null,
    };
  },
  ["coverage"],
  { revalidate: 120 }
);
