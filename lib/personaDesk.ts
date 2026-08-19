import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { safeQuery } from "@/lib/safeQuery";
import { Region } from "@/lib/enums";
import { getSectorSignals, type SectorSignal } from "@/lib/opportunity";
import { metaForSector, type SectorMeta } from "@/lib/sectorMeta";
import { rankForPersona, type Persona } from "@/lib/personas";
import type { FeedArticle } from "@/components/ArticleRow";

/** How far back a persona's front page looks. */
const BRIEFING_DAYS = 14;

/**
 * How many stories to score. The desk shows a dozen; it scores far more than
 * it shows, because the whole point is that the top of the desk is chosen
 * rather than merely latest - and you cannot choose from twelve rows.
 */
const SCORE_POOL = 300;

/** Headlines shown under each sector card. Enough to see what kind of news it is. */
const STORIES_PER_SECTOR = 3;

export type PersonaSectorRead = {
  meta: SectorMeta;
  /** Measured coverage signal. Absent for a sector with no coverage at all. */
  signal: SectorSignal | undefined;
  /** The sector's latest stories, newest first. */
  articles: FeedArticle[];
};

export type PersonaBriefing = {
  /** The persona's stories, most relevant first. */
  top: FeedArticle[];
  /** One entry per sector the persona tracks, in the order the persona lists them. */
  sectors: PersonaSectorRead[];
};

/**
 * Everything a persona desk shows above its archive.
 *
 * The selection is deliberately broad - a story qualifies on its section *or*
 * on any tracked sector - and the ordering is what makes the desk specific.
 * A narrow AND would be empty on a quiet day; see `personaScore` for why the
 * ranking is doing the work instead.
 */
export function personaScopeWhere(persona: Persona): Prisma.ArticleWhereInput {
  return {
    OR: [
      { category: { in: persona.categories } },
      { tags: { hasSome: persona.sectors } },
    ],
  };
}

export async function getPersonaBriefing(
  persona: Persona,
  region: Region,
  limit: number
): Promise<PersonaBriefing> {
  const since = new Date(Date.now() - BRIEFING_DAYS * 24 * 60 * 60 * 1000);

  const poolQuery = safeQuery(
    () =>
      db.article.findMany({
        where: { region, publishedAt: { gte: since }, ...personaScopeWhere(persona) },
        orderBy: { publishedAt: "desc" },
        include: { source: true },
        take: SCORE_POOL,
      }),
    [] as FeedArticle[]
  );

  // One query per tracked sector rather than one big query bucketed in memory:
  // a persona's sectors differ in volume by an order of magnitude, and the
  // loudest of them would otherwise fill the pool and leave the quiet ones -
  // which are often the interesting ones - showing nothing.
  const sectorQuery = Promise.all(
    persona.sectors.map((key) =>
      safeQuery(
        () =>
          db.article.findMany({
            where: { region, tags: { has: key } },
            orderBy: { publishedAt: "desc" },
            include: { source: true },
            take: STORIES_PER_SECTOR,
          }),
        [] as FeedArticle[]
      )
    )
  );

  const [pool, perSector, signals] = await Promise.all([
    poolQuery,
    sectorQuery,
    safeQuery(() => getSectorSignals(region), [] as SectorSignal[]),
  ]);

  const byKey = new Map(signals.map((signal) => [signal.key, signal]));

  return {
    top: rankForPersona(pool, persona).slice(0, limit),
    sectors: persona.sectors.map((key, i) => ({
      meta: metaForSector(key),
      signal: byKey.get(key),
      articles: perSector[i],
    })),
  };
}
