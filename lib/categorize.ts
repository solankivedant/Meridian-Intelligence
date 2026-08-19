import { Category } from "@/lib/enums";

type Rule = {
  category: Category;
  keywords: string[];
};

// Ordered by specificity: first matching rule wins. Keep narrower/rarer
// categories above broad ones (e.g. "subsidy" before generic "policy").
const RULES: Rule[] = [
  {
    category: Category.SUBSIDY_SCHEME,
    keywords: [
      "subsidy",
      "subsidies",
      "incentive scheme",
      "pli scheme",
      "production linked incentive",
      "seed fund",
      "grant",
      "credit guarantee",
      "interest-free loan",
      "tax exemption",
      "tax holiday",
      "viability gap funding",
    ],
  },
  {
    category: Category.TECH_INNOVATION,
    keywords: [
      "semiconductor",
      "artificial intelligence",
      " ai ",
      "deep tech",
      "startup",
      "innovation",
      "digital india",
      "electric vehicle",
      " ev ",
      "renewable energy",
      "solar",
      "green hydrogen",
      "space tech",
      "drone",
      "biotech",
      "quantum",
      "5g",
      "6g",
      "data center",
    ],
  },
  {
    category: Category.BUSINESS_STARTUP,
    keywords: [
      "startup india",
      "funding round",
      "series a",
      "series b",
      "unicorn",
      "ipo",
      "venture capital",
      "incubator",
      "msme",
      "ease of doing business",
      "new venture",
      "acquisition",
      "merger",
    ],
  },
  {
    category: Category.INVESTMENT_FDI,
    keywords: [
      "foreign direct investment",
      "fdi",
      "invest india",
      "investment summit",
      "mou signed",
      "memorandum of understanding",
      "sovereign fund",
      "portfolio investment",
      "fpi",
    ],
  },
  {
    category: Category.TRADE_IMPORT_EXPORT,
    keywords: [
      "export",
      "import",
      "trade deficit",
      "trade surplus",
      "free trade agreement",
      "fta",
      "customs duty",
      "tariff",
      "dgft",
      "trade agreement",
      "shipment",
      "container traffic",
    ],
  },
  {
    category: Category.GEOPOLITICS,
    keywords: [
      "bilateral",
      "diplomat",
      "foreign policy",
      "geopolit",
      "sanctions",
      "united nations",
      "g20",
      "summit",
      "border dispute",
      "defence deal",
      "strategic partnership",
      "external affairs",
    ],
  },
  {
    category: Category.ECONOMY_MARKETS,
    keywords: [
      "gdp",
      "inflation",
      "repo rate",
      "monetary policy",
      "rbi",
      "stock market",
      "sensex",
      "nifty",
      "rupee",
      "fiscal deficit",
      "budget",
      "economic survey",
      "interest rate",
      "cpi",
      "wpi",
    ],
  },
  {
    category: Category.POLICY_REGULATORY,
    keywords: [
      "notification",
      "regulation",
      "policy",
      "bill passed",
      "act amended",
      "cabinet approves",
      "ministry",
      "compliance",
      "guideline",
      "circular",
    ],
  },
];

type TagRule = {
  key: string;
  label: string;
  keywords: string[];
};

// Sub-domain / sector tags - cross-cutting, independent of category. An
// article can carry several (e.g. a POLICY_REGULATORY piece about a new
// EV subsidy gets both "electric-vehicles" and "renewable-energy" tags).
// Curated to 25 business-relevant sub-domains.
const TAG_RULES: TagRule[] = [
  { key: "renewable-energy", label: "Renewable Energy", keywords: ["renewable energy", "solar power", "solar energy", "wind energy", "green hydrogen", "clean energy", "hydropower"] },
  { key: "sustainability", label: "Sustainability & ESG", keywords: ["sustainable", "sustainability", " esg ", "carbon emission", "net zero", "net-zero", "climate change", "decarbon"] },
  { key: "semiconductors", label: "Semiconductors", keywords: ["semiconductor", "chip manufacturing", "chip fab", "microchip"] },
  { key: "ai", label: "Artificial Intelligence", keywords: ["artificial intelligence", " ai ", "machine learning", "generative ai"] },
  { key: "electric-vehicles", label: "Electric Vehicles", keywords: ["electric vehicle", " ev ", "e-mobility", "ev charging", "battery swapping"] },
  { key: "space", label: "Space & Aerospace", keywords: ["space tech", "isro", "satellite launch", "spacecraft", "space mission"] },
  { key: "defence", label: "Defence", keywords: ["defence", "defense deal", "military", "armed forces", "defence procurement"] },
  { key: "manufacturing", label: "Manufacturing", keywords: ["manufacturing", "make in india", "factory output", "industrial production"] },
  { key: "agriculture", label: "Agriculture", keywords: ["agriculture", "farmer", "agri-tech", "crop", "msp ", "minimum support price"] },
  { key: "pharma-healthcare", label: "Pharma & Healthcare", keywords: ["pharma", "healthcare", "hospital", "drug approval", "clinical trial", "vaccine"] },
  { key: "fintech", label: "Fintech & Digital Payments", keywords: ["fintech", "digital payment", "upi ", "unified payments interface", "digital lending"] },
  { key: "banking", label: "Banking & NBFC", keywords: [" bank ", "banking sector", "nbfc", "public sector bank", "cooperative bank"] },
  { key: "real-estate", label: "Real Estate", keywords: ["real estate", "housing sector", "realty", "property market"] },
  { key: "telecom", label: "Telecom", keywords: ["telecom", "5g rollout", "6g", "spectrum auction", "broadband"] },
  { key: "ports-shipping", label: "Ports & Shipping", keywords: ["port ", "seaport", "shipping industry", "maritime", "container traffic", "container terminal"] },
  { key: "logistics", label: "Logistics & Supply Chain", keywords: ["logistics", "supply chain", "warehousing", "freight"] },
  { key: "msme", label: "MSME", keywords: ["msme", "small business", "small and medium enterprise", "sme sector"] },
  { key: "startups-vc", label: "Startups & VC", keywords: ["startup", "unicorn", "venture capital", "funding round", "series a", "series b"] },
  { key: "textiles", label: "Textiles & Apparel", keywords: ["textile", "apparel", "garment industry"] },
  { key: "steel-mining", label: "Steel & Mining", keywords: ["steel sector", "mining", "mineral block", "iron ore", "coal production"] },
  { key: "automobiles", label: "Automobiles", keywords: ["automobile", "auto sector", "vehicle sales", "car manufacturer"] },
  { key: "it-software", label: "IT & Software", keywords: [" it sector", "software industry", "saas", "it services"] },
  { key: "food-fmcg", label: "Food & FMCG", keywords: ["fmcg", "food processing", "packaged food", "consumer goods"] },
  { key: "oil-gas", label: "Oil & Gas", keywords: ["oil and gas", "crude oil", "natural gas", "petroleum", "lng "] },
  { key: "infrastructure", label: "Infrastructure & Roads", keywords: ["infrastructure project", "highway", "road project", "national highway"] },
];

export const TAG_META = TAG_RULES.map(({ key, label }) => ({ key, label }));

const TAG_LABEL_BY_KEY = new Map(TAG_RULES.map((t) => [t.key, t.label]));

export function tagLabel(tag: string): string {
  const known = TAG_LABEL_BY_KEY.get(tag);
  if (known) return known;
  // Fallback for any legacy/unrecognized tag values already stored: humanize
  // "trade-agreement" / "trade agreement" -> "Trade Agreement".
  return tag
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((word) => (word.length <= 3 ? word.toUpperCase() : word[0].toUpperCase() + word.slice(1)))
    .join(" ");
}

export function categorize(
  title: string,
  excerpt: string,
  fallback: Category
): { category: Category; tags: string[]; matched: boolean } {
  const haystack = ` ${title.toLowerCase()} ${excerpt.toLowerCase()} `;

  let category = fallback;
  let matched = false;
  for (const rule of RULES) {
    if (rule.keywords.some((kw) => haystack.includes(kw))) {
      category = rule.category;
      matched = true;
      break;
    }
  }

  const tags = TAG_RULES.filter((t) => t.keywords.some((kw) => haystack.includes(kw))).map((t) => t.key);

  return { category, tags, matched };
}
