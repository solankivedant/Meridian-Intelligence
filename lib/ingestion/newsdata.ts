import { RawArticle } from "./types";
import { truncate } from "./util";

type NewsDataResponse = {
  results?: {
    title: string;
    link: string;
    description: string | null;
    pubDate: string;
  }[];
};

// Optional source: only runs if NEWSDATA_API_KEY is configured. Free tier
// (newsdata.io) allows commercial use, 200 credits/day, India + business
// filters - see README for signup steps.
export async function fetchNewsDataArticles(): Promise<RawArticle[]> {
  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) return [];

  const url = new URL("https://newsdata.io/api/1/news");
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("country", "in");
  url.searchParams.set("language", "en");
  // "politics"/"world" on NewsData.io skew toward general political/crime
  // news, not government policy - dropped in favor of the strict categorize()
  // filter (see sources.ts) doing the topical filtering instead.
  url.searchParams.set("category", "business,technology");

  const res = await fetch(url.toString());
  if (!res.ok) {
    console.error(`NewsData.io request failed: ${res.status}`);
    return [];
  }

  const data: NewsDataResponse = await res.json();

  return (data.results ?? [])
    .filter((item) => item.title && item.link)
    .map((item) => ({
      title: item.title,
      excerpt: truncate(item.description ?? item.title, 600),
      url: item.link,
      publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
    }));
}
