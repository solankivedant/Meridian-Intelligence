import Parser from "rss-parser";
import { RawArticle, SourceConfig } from "./types";
import { stripHtml, truncate } from "./util";

const parser = new Parser({
  headers: {
    // Several government/news RSS endpoints 403/406 on rss-parser's default
    // `Accept: application/rss+xml` (strict content negotiation) or its
    // `User-Agent: rss-parser` - a browser-like Accept + UA works reliably.
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "*/*",
  },
});

export async function fetchRssArticles(
  source: SourceConfig
): Promise<RawArticle[]> {
  const feed = await parser.parseURL(source.url);

  return (feed.items ?? [])
    .filter((item) => item.title && item.link)
    .map((item) => {
      const rawExcerpt = item.contentSnippet || item.content || item.title || "";
      return {
        title: stripHtml(item.title!),
        excerpt: truncate(stripHtml(rawExcerpt), 600),
        url: item.link!,
        publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
      };
    });
}
