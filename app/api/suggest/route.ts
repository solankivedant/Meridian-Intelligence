import { NextRequest, NextResponse } from "next/server";
import { searchArticles, MAX_QUERY_LENGTH } from "@/lib/search";
import { metaForCategory } from "@/lib/categoryMeta";

/** Enough to fill the dropdown without turning it into a results page. */
const SUGGESTION_LIMIT = 6;

export const revalidate = 0;

/**
 * Typeahead behind the masthead search box.
 *
 * It runs the same prefix-wildcard tsquery the results page uses, so what the
 * dropdown shows while you type is a genuine preview of what pressing Enter
 * will return — a separate matching rule here would make the two disagree.
 */
export async function GET(req: NextRequest) {
  const query = (req.nextUrl.searchParams.get("q") ?? "").slice(0, MAX_QUERY_LENGTH).trim();
  if (query.length < 2) return NextResponse.json({ suggestions: [] });

  try {
    const { articles, total } = await searchArticles(query, {}, { take: SUGGESTION_LIMIT });
    return NextResponse.json({
      total,
      suggestions: articles.map((article) => ({
        id: article.id,
        title: article.title,
        url: article.url,
        sourceName: article.source.name,
        colorVar: metaForCategory(article.category).colorVar,
        categoryLabel: metaForCategory(article.category).shortLabel,
      })),
    });
  } catch (err) {
    // A failed lookup should leave the box behaving like a plain search field,
    // never surface an error under the cursor mid-keystroke.
    console.error("Suggestion lookup failed:", err);
    return NextResponse.json({ suggestions: [] });
  }
}
