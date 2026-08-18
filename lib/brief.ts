import { Category, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { BriefSummary, SummarizableArticle, summarizeBrief } from "@/lib/summarize";

const ITEMS_PER_CATEGORY = 4;

export type BriefHighlightItem = {
  id: string;
  title: string;
  url: string;
  sourceName: string;
  publishedAt: string;
};

export type BriefHighlights = Partial<Record<Category, BriefHighlightItem[]>>;

/** Narrows the stored `summary` column back to the shape summarize.ts wrote. */
export function briefSummaryOf(summary: Prisma.JsonValue | null): BriefSummary | null {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return null;
  const candidate = summary as Partial<BriefSummary>;
  if (typeof candidate.overview !== "string" || !Array.isArray(candidate.points)) return null;
  return candidate as BriefSummary;
}

function startOfTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function generateDailyBrief() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const recentArticles = await db.article.findMany({
    where: { publishedAt: { gte: since } },
    orderBy: { publishedAt: "desc" },
    include: { source: true },
    take: 500,
  });

  const highlights: BriefHighlights = {};
  // The same stories feed the written summary, so the wrap never refers to a
  // development the panel beside it doesn't list.
  const summarizable: SummarizableArticle[] = [];

  for (const article of recentArticles) {
    const bucket = highlights[article.category] ?? [];
    if (bucket.length >= ITEMS_PER_CATEGORY) continue;
    bucket.push({
      id: article.id,
      title: article.title,
      url: article.url,
      sourceName: article.source.name,
      publishedAt: article.publishedAt.toISOString(),
    });
    highlights[article.category] = bucket;
    summarizable.push({
      title: article.title,
      excerpt: article.excerpt,
      category: article.category,
      source: { name: article.source.name },
    });
  }

  const summary = await summarizeBrief(summarizable);
  const date = startOfTodayUTC();

  return db.dailyBrief.upsert({
    where: { date },
    // A failed summarisation leaves whatever the last successful run wrote
    // rather than blanking the day's wrap.
    update: {
      highlights,
      generatedAt: new Date(),
      ...(summary ? { summary } : {}),
    },
    create: { date, highlights, summary: summary ?? Prisma.JsonNull },
  });
}

export async function getLatestBrief() {
  return db.dailyBrief.findFirst({ orderBy: { date: "desc" } });
}
