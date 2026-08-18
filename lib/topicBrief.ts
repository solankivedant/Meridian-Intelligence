import { Region } from "@/lib/enums";
import { searchArticles } from "@/lib/search";
import { generateJson, geminiModel, isGeminiConfigured } from "@/lib/gemini";
import { metaForCategory } from "@/lib/categoryMeta";
import { rangeCutoff, TimeRangeKey } from "@/lib/timeRange";
import { shortDate } from "@/lib/formatTime";
import type { FeedArticle } from "@/components/ArticleRow";

/**
 * The personalised desk: a reader names a topic, and Gemini reads everything
 * the archive holds on it and hands back the headlines that actually matter,
 * ranked, each with a line on why it is there.
 *
 * Retrieval is Postgres' job; judgement is the model's. Full-text search
 * decides what could be relevant (cheap, exhaustive, and it never invents a
 * story); the model only reorders and annotates that candidate list, and every
 * pick is resolved back to a real row before it reaches the page. A model that
 * hallucinates a headline here simply loses its pick.
 */

/** Rows handed to the model. Past this the prompt is mostly near-duplicates. */
const MAX_CANDIDATES = 40;

/** Below this, an AND-ed query is treated as too narrow and re-run as OR. */
const MIN_STRICT_HITS = 6;

const MAX_EXCERPT_CHARS = 220;

/** Enough for a page of ranked tiles without turning back into a feed. */
export const MAX_PICKS = 12;

export type TopicPick = {
  article: FeedArticle;
  /** One line on why this story made the cut. */
  note: string;
};

export type TopicBrief = {
  topic: string;
  /** Null when the model was unavailable - the ranked list still stands. */
  overview: string | null;
  themes: string[];
  picks: TopicPick[];
  /** Relevant, but not important enough for the model to rank. */
  rest: FeedArticle[];
  candidates: number;
  model: string | null;
  generatedAt: Date;
  /** Why a brief has no written read, when it has none. */
  degraded: "none" | "unconfigured" | "failed";
};

export type TopicRequest = {
  topic: string;
  range: TimeRangeKey;
  region?: Region;
};

const SYSTEM_PROMPT = `You are a research editor building one reader's personalised desk on Indian policy, business, and economic news.

You are given a topic the reader follows and a numbered list of candidate headlines pulled from the archive by keyword search. Keyword search is blunt: some candidates will be off-topic, some are near-duplicates, and many are routine filings of no consequence.

Your job:
- Select only the candidates that genuinely matter to someone following this topic, most important first. Importance means a decision taken, money committed, a rule changed, a number that moves the sector, or a shift in direction. Not routine notices, auction results, procedural circulars, promotional items, or opinion.
- Drop anything off-topic. Drop near-duplicates, keeping the best-sourced version.
- Select fewer items rather than padding the list. If only three candidates matter, return three.
- For each pick write one line on what it means for this topic. Use ONLY what the headline and excerpt state - never add figures, names, dates, or outcomes that are not in the input, and do not restate the headline verbatim.
- The overview says what has been happening on this topic across the picks. It is a briefing, not a description of your own selection process.

Style: Indian English, third person, plain and specific. Amounts in the form the source uses (crore, lakh, billion). No markdown and no bullet characters - every field is rendered as plain text.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    overview: {
      type: "string",
      description:
        "2-4 sentences (max ~70 words) on where this topic stands, drawn only from the picks.",
    },
    themes: {
      type: "array",
      maxItems: 5,
      description: "The threads running through the picks, 1-3 words each, e.g. customs duty.",
      items: { type: "string" },
    },
    picks: {
      type: "array",
      minItems: 1,
      maxItems: MAX_PICKS,
      description: "The candidates worth the reader's time, most important first.",
      items: {
        type: "object",
        properties: {
          index: {
            type: "integer",
            description: "The number of the candidate, exactly as given in the list.",
          },
          why: {
            type: "string",
            description: "One line, max ~22 words, on why this matters for the topic.",
          },
        },
        required: ["index", "why"],
      },
    },
  },
  required: ["overview", "picks"],
} as const;

type RawBrief = {
  overview?: unknown;
  themes?: unknown;
  picks?: { index?: unknown; why?: unknown }[];
};

/**
 * Retrieves the candidate pool.
 *
 * A strict AND query is right when it works - "semiconductor fab subsidy"
 * should mean all three. But readers describe topics in sentences, and an
 * eight-term AND matches nothing; rather than show an empty desk, the query is
 * re-run as OR and left to ts_rank to sort out.
 */
async function retrieve({ topic, range, region }: TopicRequest): Promise<FeedArticle[]> {
  const filters = { region, since: rangeCutoff(range) };

  const strict = await searchArticles(topic, filters, { take: MAX_CANDIDATES });
  if (strict.articles.length >= MIN_STRICT_HITS) return strict.articles;

  const loose = await searchArticles(topic, filters, { take: MAX_CANDIDATES, mode: "any" });
  // Strict hits are by definition also loose hits, so the wider result set
  // supersedes the narrow one whenever it found more.
  return loose.articles.length > strict.articles.length ? loose.articles : strict.articles;
}

function buildPrompt(topic: string, candidates: FeedArticle[]): string {
  const lines = candidates.map((article, i) => {
    const excerpt = article.excerpt.replace(/\s+/g, " ").trim().slice(0, MAX_EXCERPT_CHARS);
    const label = metaForCategory(article.category).label;
    const head = `[${i + 1}] ${article.title}`;
    const meta = `    ${article.source.name} - ${label} - ${shortDate(article.publishedAt)}`;
    return excerpt ? `${head}\n${meta}\n    ${excerpt}` : `${head}\n${meta}`;
  });

  return `Topic the reader follows: ${topic}

Candidates (${candidates.length}):

${lines.join("\n\n")}`;
}

function cleanThemes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((theme) => (typeof theme === "string" ? [theme.trim()] : []))
    .filter(Boolean)
    .slice(0, 5);
}

/**
 * Builds a personalised topic brief.
 *
 * Never throws, and never returns nothing useful: when Gemini is unconfigured
 * or fails, the search ranking is handed back unannotated with `degraded` set,
 * and the page renders the same stories without the written read.
 */
export async function buildTopicBrief(request: TopicRequest): Promise<TopicBrief> {
  const candidates = await retrieve(request);

  const base: TopicBrief = {
    topic: request.topic,
    overview: null,
    themes: [],
    picks: [],
    rest: [],
    candidates: candidates.length,
    model: null,
    generatedAt: new Date(),
    degraded: "none",
  };

  if (candidates.length === 0) return base;

  // Search order is the fallback ranking: relevance first, recency as the
  // tiebreak (see lib/search.ts).
  const unranked = (degraded: TopicBrief["degraded"]): TopicBrief => ({
    ...base,
    degraded,
    picks: candidates.slice(0, MAX_PICKS).map((article) => ({ article, note: "" })),
    rest: candidates.slice(MAX_PICKS),
  });

  if (!isGeminiConfigured()) return unranked("unconfigured");

  const model = geminiModel();

  try {
    const raw = await generateJson<RawBrief>({
      system: SYSTEM_PROMPT,
      prompt: buildPrompt(request.topic, candidates),
      schema: RESPONSE_SCHEMA,
      model,
      maxOutputTokens: 2048,
      temperature: 0.35,
      timeoutMs: 30_000,
      attempts: 2,
    });

    const seen = new Set<string>();
    const picks: TopicPick[] = [];

    for (const pick of raw.picks ?? []) {
      // The model returns positions in the list it was given; anything outside
      // that list, or repeated, is dropped rather than guessed at.
      const index = typeof pick.index === "number" ? Math.trunc(pick.index) - 1 : -1;
      const article = candidates[index];
      if (!article || seen.has(article.id)) continue;
      seen.add(article.id);
      picks.push({ article, note: typeof pick.why === "string" ? pick.why.trim() : "" });
      if (picks.length === MAX_PICKS) break;
    }

    if (picks.length === 0) return unranked("failed");

    const overview = typeof raw.overview === "string" ? raw.overview.trim() : "";

    return {
      ...base,
      overview: overview || null,
      themes: cleanThemes(raw.themes),
      picks,
      // Everything the model passed over, still in relevance order - the
      // reader can disagree with the edit without running a second search.
      rest: candidates.filter((article) => !seen.has(article.id)),
      model,
    };
  } catch (err) {
    console.error("Gemini topic brief failed:", err);
    return unranked("failed");
  }
}
