import { Category } from "@prisma/client";
import { db } from "@/lib/db";

const ITEMS_PER_CATEGORY = 4;

export type BriefHighlightItem = {
  id: string;
  title: string;
  url: string;
  sourceName: string;
  publishedAt: string;
};

export type BriefHighlights = Partial<Record<Category, BriefHighlightItem[]>>;

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
  }

  const date = startOfTodayUTC();

  return db.dailyBrief.upsert({
    where: { date },
    update: { highlights, generatedAt: new Date() },
    create: { date, highlights },
  });
}

export async function getLatestBrief() {
  return db.dailyBrief.findFirst({ orderBy: { date: "desc" } });
}
