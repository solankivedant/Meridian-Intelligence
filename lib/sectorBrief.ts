import { unstable_cache } from "next/cache";
import { generateJson, geminiModel, isGeminiConfigured } from "@/lib/gemini";

/**
 * The market-side read on a sector: how big it is, how fast it is growing, what
 * drives it, what could break it, and the routes a public-market investor
 * actually has into it.
 *
 * This is the one part of the opportunities desk that the archive cannot
 * supply. Story counts measure attention; nobody allocates capital on
 * attention. So the figures here come from the model, and the page is
 * unambiguous about that - every number is marked as an estimate, attributed
 * to the model that wrote it, and dated. Nothing here is a quote, a filing, or
 * a price, and none of it is advice. Where the model is not configured the
 * panel simply does not render and the measured signals stand on their own,
 * which is the same degradation path the daily wrap and the topic desk take.
 */

export type SectorMetric = {
  label: string;
  value: string;
  /** Where the figure comes from, in a few words. */
  basis: string;
};

export type SectorRead = {
  sector: string;
  /** Two or three sentences on the investment case as it stands. */
  overview: string;
  metrics: SectorMetric[];
  drivers: string[];
  risks: string[];
  /** How a public-market investor gets exposure - categories, never tips. */
  exposure: { route: string; note: string }[];
  /** What would have to be true for the case to work. */
  watchlist: string[];
  model: string;
  generatedAt: string;
};

const SYSTEM_PROMPT = `You are an equity research analyst writing a neutral sector primer for an Indian investor who is deciding whether a sector is worth researching further.

Ground rules:
- Give the standard, widely-published shape of the sector: approximate market size, the growth rate most commonly cited, and the ratios that actually matter for THIS sector (a bank is judged on NIM and GNPA, a cement maker on EBITDA per tonne, an IT firm on billing rates and attrition). Choose the metrics that fit the sector rather than forcing a fixed list.
- Every figure is an approximation. Write them as ranges or "about X" rather than false precision, and say in the basis field what kind of source such a figure normally comes from (industry body estimate, ministry projection, brokerage consensus). Never cite a specific report, author, date or URL - you cannot verify one.
- Exposure means CATEGORIES of instrument available to a retail investor in India: listed leaders in the segment by description, thematic or sectoral mutual funds, index or ETF routes, and the ancillary/supply-chain angle. Describe the route, not a recommendation, and never name a specific fund or give a target price, an allocation, or a buy/sell view.
- Risks must be specific to the sector - regulatory dependence, input costs, import exposure, execution risk, cyclicality - not generic market risk.
- The watchlist is what a reader should watch to see whether the case is playing out: a policy decision, a capacity number, a price, a tender.

Style: Indian English, third person, plain and specific. Amounts in the form Indian readers use (crore, lakh crore, billion). No markdown, no bullet characters, no headings - every field is rendered as plain text.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    overview: {
      type: "string",
      description:
        "3-4 sentences on where this sector stands for an investor: what it is, what is driving it now, and what the debate is.",
    },
    metrics: {
      type: "array",
      minItems: 4,
      maxItems: 7,
      description:
        "The headline numbers for this sector, including market size and the commonly cited CAGR, plus the ratios that matter for this particular industry.",
      items: {
        type: "object",
        properties: {
          label: { type: "string", description: "e.g. Market size, CAGR, EBITDA margin" },
          value: { type: "string", description: "e.g. about Rs 4-5 lakh crore, 12-14% a year" },
          basis: {
            type: "string",
            description:
              "Max ~12 words on what kind of source such a figure comes from. No named reports.",
          },
        },
        required: ["label", "value", "basis"],
      },
    },
    drivers: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      description: "What is actually pushing this sector, one line each.",
      items: { type: "string" },
    },
    risks: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      description: "Sector-specific risks, one line each.",
      items: { type: "string" },
    },
    exposure: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      description: "Categories of exposure available to an Indian retail investor.",
      items: {
        type: "object",
        properties: {
          route: { type: "string", description: "e.g. Listed integrated producers" },
          note: { type: "string", description: "One line on what this route gets you and its catch." },
        },
        required: ["route", "note"],
      },
    },
    watchlist: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      description: "What to watch to see whether the case is playing out.",
      items: { type: "string" },
    },
  },
  required: ["overview", "metrics", "drivers", "risks", "exposure", "watchlist"],
} as const;

type RawRead = {
  overview?: unknown;
  metrics?: { label?: unknown; value?: unknown; basis?: unknown }[];
  drivers?: unknown;
  risks?: unknown;
  exposure?: { route?: unknown; note?: unknown }[];
  watchlist?: unknown;
};

function lines(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function buildPrompt(sector: string, headlines: string[]): string {
  const recent = headlines.length
    ? `\n\nFor context, these are the most recent headlines the archive holds on this sector. Use them only to judge what is currently live in the sector - do not summarise them, and do not treat them as the source of your figures:\n${headlines
        .slice(0, 25)
        .map((headline, i) => `${i + 1}. ${headline}`)
        .join("\n")}`
    : "";

  return `Sector: ${sector} (India).${recent}`;
}

/**
 * Written once every six hours per sector, not once per reader.
 *
 * The model call takes tens of seconds and costs money, and a sector primer is
 * the same document for everyone who opens the page - it moves on the timescale
 * of quarters, not requests.
 */
export const getSectorRead = unstable_cache(
  async (sector: string, headlines: string[]): Promise<SectorRead | null> => {
    if (!isGeminiConfigured()) return null;

    const model = geminiModel();

    try {
      const raw = await generateJson<RawRead>({
        system: SYSTEM_PROMPT,
        prompt: buildPrompt(sector, headlines),
        schema: RESPONSE_SCHEMA,
        model,
        maxOutputTokens: 2048,
        temperature: 0.3,
        timeoutMs: 30_000,
        attempts: 2,
      });

      const overview = typeof raw.overview === "string" ? raw.overview.trim() : "";
      const metrics = (raw.metrics ?? []).flatMap((metric) => {
        const label = typeof metric.label === "string" ? metric.label.trim() : "";
        const value = typeof metric.value === "string" ? metric.value.trim() : "";
        if (!label || !value) return [];
        return [
          {
            label,
            value,
            basis: typeof metric.basis === "string" ? metric.basis.trim() : "",
          },
        ];
      });
      const exposure = (raw.exposure ?? []).flatMap((entry) => {
        const route = typeof entry.route === "string" ? entry.route.trim() : "";
        if (!route) return [];
        return [{ route, note: typeof entry.note === "string" ? entry.note.trim() : "" }];
      });

      // A read with no overview or no numbers is not a read; showing half a
      // panel would imply the rest was deliberate.
      if (!overview || metrics.length === 0) return null;

      return {
        sector,
        overview,
        metrics: metrics.slice(0, 7),
        drivers: lines(raw.drivers, 5),
        risks: lines(raw.risks, 5),
        exposure: exposure.slice(0, 5),
        watchlist: lines(raw.watchlist, 5),
        model,
        generatedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.error(`Gemini sector read failed for ${sector}:`, err);
      return null;
    }
  },
  ["sector-read"],
  { revalidate: 21_600 }
);
