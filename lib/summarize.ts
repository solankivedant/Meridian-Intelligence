import { Category } from "@/lib/enums";
import { generateJson, geminiModel, isGeminiConfigured } from "@/lib/gemini";
import { metaForCategory } from "@/lib/categoryMeta";

/** One takeaway, tagged with the desk it belongs to so the UI can colour it. */
export type BriefPoint = {
  category: Category;
  text: string;
};

export type BriefSummary = {
  /** A standfirst: what the last 24 hours amounted to, in 2-3 sentences. */
  overview: string;
  points: BriefPoint[];
  model: string;
  generatedAt: string;
};

export type SummarizableArticle = {
  title: string;
  excerpt: string;
  category: Category;
  source: { name: string };
};

/** Headlines fed to the model. Beyond this the prompt is mostly repetition. */
const MAX_ARTICLES = 60;
const MAX_EXCERPT_CHARS = 240;
const MIN_ARTICLES = 3;

const SYSTEM_PROMPT = `You are the editor of a daily briefing on Indian policy, business, and economic news.

You are given the headlines this desk collected in the last 24 hours, grouped by category. Write the briefing that goes at the top of the page.

Rules:
- Use ONLY the headlines and excerpts provided. Never add figures, names, dates, or outcomes that are not in the input.
- Where several headlines cover the same development, treat them as one story.
- Lead with what actually matters to a business reader: decisions taken, money moved, rules changed. Ignore routine or promotional items.
- Write plainly and specifically. No hedging, no "various developments", no meta-commentary about the briefing itself.
- Indian English, third person, present or present-perfect tense. Amounts in the form the source uses (crore, lakh, billion).
- No markdown, no bullet characters, no headings — the fields are rendered as plain text.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    overview: {
      type: "string",
      description:
        "2-3 sentences (max ~55 words) on the day's through-line across every category.",
    },
    points: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      description: "The individual developments worth knowing, most consequential first.",
      items: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: Object.values(Category),
            description: "The category of the story this point is drawn from.",
          },
          text: {
            type: "string",
            description: "One sentence, max ~28 words, naming the actor and the action.",
          },
        },
        required: ["category", "text"],
      },
    },
  },
  required: ["overview", "points"],
} as const;

type RawSummary = {
  overview?: unknown;
  points?: { category?: unknown; text?: unknown }[];
};

/** Groups the day's headlines under their category label, most recent first. */
function buildPrompt(articles: SummarizableArticle[]): string {
  const byCategory = new Map<Category, SummarizableArticle[]>();
  for (const article of articles.slice(0, MAX_ARTICLES)) {
    const bucket = byCategory.get(article.category) ?? [];
    bucket.push(article);
    byCategory.set(article.category, bucket);
  }

  const sections = [...byCategory.entries()].map(([category, items]) => {
    const lines = items.map((item) => {
      const excerpt = item.excerpt.replace(/\s+/g, " ").trim().slice(0, MAX_EXCERPT_CHARS);
      return `- ${item.title} (${item.source.name})${excerpt ? `\n  ${excerpt}` : ""}`;
    });
    return `## ${metaForCategory(category).label}\n${lines.join("\n")}`;
  });

  return `Headlines from the last 24 hours (${articles.length} stories):\n\n${sections.join("\n\n")}`;
}

function isCategory(value: unknown): value is Category {
  return typeof value === "string" && value in Category;
}

/**
 * Writes the daily brief's summary with Gemini.
 *
 * Returns null rather than throwing whenever the summary can't be produced —
 * no key, too little news, or an API failure. The brief is built by a cron job
 * whose real product is the headline list; losing the written summary must not
 * cost the day its brief.
 */
export async function summarizeBrief(
  articles: SummarizableArticle[]
): Promise<BriefSummary | null> {
  if (!isGeminiConfigured()) return null;
  if (articles.length < MIN_ARTICLES) return null;

  const model = geminiModel();

  try {
    const raw = await generateJson<RawSummary>({
      system: SYSTEM_PROMPT,
      prompt: buildPrompt(articles),
      schema: RESPONSE_SCHEMA,
      model,
      maxOutputTokens: 1024,
      temperature: 0.4,
      // Sized against the cron route's 60s budget: two tries at 20s each,
      // plus the article query, still leaves room to write the brief.
      timeoutMs: 20_000,
      attempts: 2,
    });

    const overview = typeof raw.overview === "string" ? raw.overview.trim() : "";
    const points = (raw.points ?? []).flatMap((point) => {
      const text = typeof point.text === "string" ? point.text.trim() : "";
      if (!text || !isCategory(point.category)) return [];
      return [{ category: point.category, text }];
    });

    if (!overview || points.length === 0) return null;

    return { overview, points, model, generatedAt: new Date().toISOString() };
  } catch (err) {
    console.error("Gemini brief summary failed:", err);
    return null;
  }
}
