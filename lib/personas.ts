import { Category } from "@/lib/enums";
import {
  Briefcase,
  GraduationCap,
  Lightbulb,
  Scale,
  TrendingUp,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { FeedArticle } from "@/components/ArticleRow";

/**
 * The same archive, read as a handful of different jobs.
 *
 * Every other way into this site is organised by what a story *is* - its
 * section, its sector, when it was filed. That is the right index for someone
 * who already knows what they are looking for, and the wrong one for everyone
 * else: a founder and a family office read the same RBI circular for completely
 * different reasons, and neither of them thinks of themselves as wanting
 * "Policy & Regulatory, last 7 days".
 *
 * A persona is not a new kind of data and nothing here is stored against an
 * article. It is a saved reading of the archive - a weighted set of sections
 * and sectors, applied to rows that already exist. That is deliberate: it means
 * a persona can be re-tuned, added or dropped in this file alone, with no
 * migration and no re-tagging, and it means every figure on a persona desk is
 * the same measured figure it is everywhere else on the site.
 */
export type Persona = {
  key: string;
  /** Sidebar and nav label. */
  label: string;
  /** The desk's own masthead. */
  title: string;
  /** One line under the label, for the sidebar and the index. */
  hint: string;
  /** What this desk is tuned to, said plainly at the top of the page. */
  blurb: string;
  colorVar: string;
  icon: LucideIcon;
  /**
   * The sections this reader lives in, most important first. Used both to
   * select stories and to weight them - see `personaScore`.
   */
  categories: Category[];
  /** Sector tags this reader tracks. Drives the sector panel and the scoring. */
  sectors: string[];
};

export const PERSONAS: Persona[] = [
  {
    key: "citizen",
    label: "Citizen",
    title: "The citizen's desk",
    hint: "Schemes you can claim, prices, and rules that reach you",
    blurb:
      "Written for someone who simply wants to know what the state is doing that lands on them: which schemes and subsidies are open and to whom, what prices and rates are doing, and the regulations that change how ordinary services, savings and property actually work.",
    colorVar: "--sec-teal",
    icon: UserRound,
    categories: [
      Category.SUBSIDY_SCHEME,
      Category.POLICY_REGULATORY,
      Category.ECONOMY_MARKETS,
    ],
    sectors: ["agriculture", "pharma-healthcare", "banking", "real-estate", "telecom", "infrastructure"],
  },
  {
    key: "student",
    label: "Student",
    title: "The student's desk",
    hint: "Where the skills, the money and the jobs are heading",
    blurb:
      "Written for someone deciding what to learn and where to start: the technologies the state is funding, the scholarships and skilling schemes on offer, and which industries are hiring and raising rather than merely being talked about.",
    colorVar: "--sec-purple",
    icon: GraduationCap,
    categories: [
      Category.TECH_INNOVATION,
      Category.SUBSIDY_SCHEME,
      Category.BUSINESS_STARTUP,
    ],
    sectors: ["ai", "it-software", "semiconductors", "space", "startups-vc", "renewable-energy"],
  },
  {
    key: "founder",
    label: "Founder & entrepreneur",
    title: "The founder's desk",
    hint: "Funding, schemes, and where the technology is going",
    blurb:
      "Written for someone building: who raised and at what, which incentive schemes are open and to whom, what the regulator has just decided about your category, and which technologies the state is putting money behind.",
    colorVar: "--sec-magenta",
    icon: Lightbulb,
    categories: [
      Category.BUSINESS_STARTUP,
      Category.TECH_INNOVATION,
      Category.SUBSIDY_SCHEME,
    ],
    sectors: ["startups-vc", "ai", "fintech", "it-software", "semiconductors", "electric-vehicles"],
  },
  {
    key: "business-owner",
    label: "Business owner",
    title: "The operator's desk",
    hint: "Compliance, input costs, trade rules, and demand",
    blurb:
      "Written for someone already running a company rather than raising for one: compliance that lands on a deadline, duty and tariff changes, what inputs and logistics are doing, and where demand in your industry is heading.",
    colorVar: "--sec-orange",
    icon: Briefcase,
    categories: [
      Category.POLICY_REGULATORY,
      Category.TRADE_IMPORT_EXPORT,
      Category.BUSINESS_STARTUP,
      Category.ECONOMY_MARKETS,
    ],
    sectors: ["manufacturing", "logistics", "msme", "textiles", "food-fmcg", "steel-mining"],
  },
  {
    key: "investor",
    label: "Investor",
    title: "The allocator's desk",
    hint: "Where capital is going, and what is pulling it there",
    blurb:
      "Written for someone deciding where money goes: announced and committed capital, foreign investment policy, the macro backdrop it is being deployed into, and which sectors this archive is getting measurably louder about.",
    colorVar: "--sec-green",
    icon: TrendingUp,
    categories: [
      Category.INVESTMENT_FDI,
      Category.ECONOMY_MARKETS,
      Category.BUSINESS_STARTUP,
    ],
    sectors: ["startups-vc", "renewable-energy", "semiconductors", "ai", "banking", "infrastructure"],
  },
  {
    key: "government",
    label: "Government & public sector",
    title: "The public sector desk",
    hint: "Notifications, schemes, and what the state is committing to",
    blurb:
      "Written for someone inside or alongside the machinery: what has actually been notified, which schemes are being funded, where the money is being committed, and how it reads against India's position abroad.",
    colorVar: "--sec-sky",
    icon: Scale,
    categories: [
      Category.POLICY_REGULATORY,
      Category.SUBSIDY_SCHEME,
      Category.GEOPOLITICS,
    ],
    sectors: ["infrastructure", "defence", "agriculture", "msme", "renewable-energy"],
  },
];

const BY_KEY = new Map(PERSONAS.map((persona) => [persona.key, persona]));

export function personaByKey(key: string): Persona | undefined {
  return BY_KEY.get(key);
}

/**
 * How well one story serves one persona.
 *
 * A persona's stories are selected by a broad "matches a section *or* a sector"
 * filter, because a narrow AND would return almost nothing on a quiet day. That
 * makes the ordering carry the weight: without it, a desk tuned to six sectors
 * shows whatever was filed most recently among them, which on this archive is
 * reliably the loudest sector rather than the most relevant story.
 *
 * So the score is a count of reasons: the section is worth more than any single
 * sector because it says what kind of news the story *is*, sections are worth
 * more the higher they sit in the persona's own list, and every matching sector
 * adds to it - a story that is both an investment story and a semiconductor
 * story outranks one that is only either. Recency is not in here at all; it is
 * applied after, within a score band, so that "most relevant" never means
 * "from three weeks ago".
 */
export function personaScore(
  article: Pick<FeedArticle, "category" | "tags">,
  persona: Persona
): number {
  const rank = persona.categories.indexOf(article.category);
  // 3 for the persona's first section, down to 1 - and 0 for a story that
  // reached this desk purely on its sector tags.
  const sectionWeight = rank === -1 ? 0 : Math.max(3 - rank, 1);
  const sectorHits = article.tags.filter((tag) => persona.sectors.includes(tag)).length;
  return sectionWeight * 2 + sectorHits;
}

/**
 * The persona's stories, most relevant first, recency breaking ties.
 *
 * Sorting on score alone would pin the same handful of stories to the top of
 * the desk for as long as they stayed in the window; sorting on date alone
 * throws the scoring away. Score first, date within it.
 */
export function rankForPersona<T extends Pick<FeedArticle, "category" | "tags" | "publishedAt">>(
  articles: T[],
  persona: Persona
): T[] {
  return articles
    .map((article) => ({ article, score: personaScore(article, persona) }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.article.publishedAt.getTime() - a.article.publishedAt.getTime()
    )
    .map((entry) => entry.article);
}
