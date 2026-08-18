import { Category } from "@/lib/enums";
import {
  Landmark,
  Gift,
  Cpu,
  Rocket,
  TrendingUp,
  LineChart,
  Ship,
  Globe2,
  type LucideIcon,
} from "lucide-react";

export type CategoryMeta = {
  category: Category;
  slug: string;
  label: string;
  shortLabel: string;
  description: string;
  colorVar: string;
  icon: LucideIcon;
};

// Order matches the validated 8-slot categorical palette (references/palette.md
// in the dataviz skill) — fixed per-category assignment, never reordered/cycled.
export const CATEGORY_META: CategoryMeta[] = [
  {
    category: Category.POLICY_REGULATORY,
    slug: "policy-regulatory",
    label: "Policy & Regulatory",
    shortLabel: "Policy",
    description: "New notifications, bills, cabinet decisions, and regulatory changes from central ministries.",
    colorVar: "--cat-policy",
    icon: Landmark,
  },
  {
    category: Category.SUBSIDY_SCHEME,
    slug: "subsidies-schemes",
    label: "Subsidies & Schemes",
    shortLabel: "Subsidies",
    description: "Incentive schemes, PLI programmes, grants, and tax relief aimed at specific sectors.",
    colorVar: "--cat-subsidy",
    icon: Gift,
  },
  {
    category: Category.TECH_INNOVATION,
    slug: "tech-innovation",
    label: "Tech & Innovation",
    shortLabel: "Tech",
    description: "Government-backed pushes in AI, semiconductors, EVs, renewables, space, and deep tech.",
    colorVar: "--cat-tech",
    icon: Cpu,
  },
  {
    category: Category.BUSINESS_STARTUP,
    slug: "business-startups",
    label: "Business & Startups",
    shortLabel: "Startups",
    description: "New ventures, funding rounds, IPOs, and the Startup India ecosystem.",
    colorVar: "--cat-business",
    icon: Rocket,
  },
  {
    category: Category.INVESTMENT_FDI,
    slug: "investment-fdi",
    label: "Investment & FDI",
    shortLabel: "Investment",
    description: "Foreign direct investment policy, investment summits, and cross-border capital flows.",
    colorVar: "--cat-investment",
    icon: TrendingUp,
  },
  {
    category: Category.ECONOMY_MARKETS,
    slug: "economy-markets",
    label: "Economy & Markets",
    shortLabel: "Economy",
    description: "GDP, inflation, RBI monetary policy, the rupee, and market-moving macro data.",
    colorVar: "--cat-economy",
    icon: LineChart,
  },
  {
    category: Category.TRADE_IMPORT_EXPORT,
    slug: "trade-import-export",
    label: "Trade (Import/Export)",
    shortLabel: "Trade",
    description: "Import/export data, tariffs, customs duty changes, and trade agreements.",
    colorVar: "--cat-trade",
    icon: Ship,
  },
  {
    category: Category.GEOPOLITICS,
    slug: "geopolitics",
    label: "Geopolitics",
    shortLabel: "Geopolitics",
    description: "Bilateral relations, foreign policy, summits, and India's strategic positioning globally.",
    colorVar: "--cat-geopolitics",
    icon: Globe2,
  },
];

const BY_CATEGORY = new Map(CATEGORY_META.map((c) => [c.category, c]));
const BY_SLUG = new Map(CATEGORY_META.map((c) => [c.slug, c]));

export function metaForCategory(category: Category): CategoryMeta {
  const meta = BY_CATEGORY.get(category);
  if (!meta) throw new Error(`No metadata for category ${category}`);
  return meta;
}

export function metaForSlug(slug: string): CategoryMeta | undefined {
  return BY_SLUG.get(slug);
}
