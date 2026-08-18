import Parser from "rss-parser";
import { Category, Region } from "@prisma/client";
import { RawArticle } from "./types";
import { stripHtml, truncate } from "./util";

// Google News' search RSS endpoint is the only free, key-less source we found
// that serves a *dated archive* rather than just a publisher's latest ~50
// items: `after:`/`before:` operators in the query return up to 100 results
// per window, which is what lets the dashboard go back months instead of days.
const ENDPOINT = "https://news.google.com/rss/search";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const parser = new Parser<unknown, { sourceTag?: string }>({
  // Each item carries the originating publisher in a <source> element; the
  // feed itself is just Google, so this is the only real attribution we get.
  customFields: { item: [["source", "sourceTag"]] },
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches the feed body over the global (connection-pooling) fetch rather than
 * letting rss-parser open its own socket per call. A long crawl issues
 * hundreds of requests to one host; opening a fresh connection each time got
 * far enough into a 24-month run to start failing DNS resolution outright.
 * Reusing the pool plus backing off on failure keeps the whole crawl alive.
 */
async function fetchFeedXml(url: string, attempts = 4): Promise<string> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) await sleep(800 * 2 ** (attempt - 1));
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "*/*" },
        signal: AbortSignal.timeout(25000),
      });
      if (!res.ok) throw new Error(`Google News responded ${res.status}`);
      return await res.text();
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export type ArchiveQuery = {
  key: string;
  label: string;
  category: Category;
  region: Region;
  query: string;
};

// One query per category, each anchored on India so the archive stays on-topic.
// Keep queries under ~200 characters — Google silently truncates long ones.
export const INDIA_ARCHIVE_QUERIES: ArchiveQuery[] = [
  {
    key: "policy",
    label: "Policy & regulation",
    category: Category.POLICY_REGULATORY,
    region: Region.INDIA,
    query:
      'India ("cabinet approves" OR "new policy" OR "draft rules" OR "regulator" OR "ministry notifies" OR "amendment") (economy OR industry OR business)',
  },
  {
    key: "subsidy",
    label: "Subsidies & schemes",
    category: Category.SUBSIDY_SCHEME,
    region: Region.INDIA,
    query:
      'India ("production linked incentive" OR "PLI scheme" OR subsidy OR "incentive scheme" OR "government scheme" OR "credit guarantee")',
  },
  {
    key: "tech",
    label: "Tech & innovation",
    category: Category.TECH_INNOVATION,
    region: Region.INDIA,
    query:
      'India (semiconductor OR "artificial intelligence" OR "deep tech" OR "green hydrogen" OR "electric vehicle" OR "data centre" OR ISRO OR "space tech")',
  },
  {
    key: "startups",
    label: "Business & startups",
    category: Category.BUSINESS_STARTUP,
    region: Region.INDIA,
    query:
      'India (startup OR "funding round" OR unicorn OR IPO OR MSME OR "venture capital" OR acquisition OR merger)',
  },
  {
    key: "investment",
    label: "Investment & FDI",
    category: Category.INVESTMENT_FDI,
    region: Region.INDIA,
    query:
      'India ("foreign direct investment" OR FDI OR "investment summit" OR "invest India" OR "capital expenditure" OR "sovereign fund" OR "private equity")',
  },
  {
    key: "economy",
    label: "Economy & markets",
    category: Category.ECONOMY_MARKETS,
    region: Region.INDIA,
    query:
      'India (GDP OR inflation OR "RBI monetary policy" OR "repo rate" OR "fiscal deficit" OR rupee OR "economic survey" OR budget)',
  },
  {
    key: "trade",
    label: "Trade",
    category: Category.TRADE_IMPORT_EXPORT,
    region: Region.INDIA,
    query:
      'India (exports OR imports OR tariff OR "customs duty" OR "free trade agreement" OR "trade deal" OR "trade deficit" OR WTO)',
  },
  {
    key: "geopolitics",
    label: "Geopolitics",
    category: Category.GEOPOLITICS,
    region: Region.INDIA,
    query:
      'India ("bilateral talks" OR "foreign policy" OR summit OR "strategic partnership" OR "defence deal" OR G20 OR BRICS OR QUAD)',
  },
];

// The same eight desks read from outside India. These deliberately avoid an
// "India" anchor and run against Google News' US/global edition, so the world
// page is genuinely a different body of stories rather than India coverage
// reprinted by foreign outlets.
export const WORLD_ARCHIVE_QUERIES: ArchiveQuery[] = [
  {
    key: "policy",
    label: "Policy & regulation",
    category: Category.POLICY_REGULATORY,
    region: Region.WORLD,
    query:
      '("new regulation" OR "regulatory crackdown" OR "antitrust" OR "central bank policy" OR "landmark ruling") (economy OR industry OR business)',
  },
  {
    key: "subsidy",
    label: "Subsidies & schemes",
    category: Category.SUBSIDY_SCHEME,
    region: Region.WORLD,
    query:
      '(subsidy OR "state aid" OR "tax credit" OR "stimulus package" OR "industrial policy" OR "CHIPS Act" OR "Inflation Reduction Act")',
  },
  {
    key: "tech",
    label: "Tech & innovation",
    category: Category.TECH_INNOVATION,
    region: Region.WORLD,
    query:
      '(semiconductor OR "artificial intelligence" OR "quantum computing" OR "electric vehicle" OR "data centre" OR "clean energy" OR robotics)',
  },
  {
    key: "startups",
    label: "Business & startups",
    category: Category.BUSINESS_STARTUP,
    region: Region.WORLD,
    query:
      '(startup OR "funding round" OR unicorn OR IPO OR "venture capital" OR acquisition OR merger OR "layoffs")',
  },
  {
    key: "investment",
    label: "Investment & FDI",
    category: Category.INVESTMENT_FDI,
    region: Region.WORLD,
    query:
      '("foreign direct investment" OR "sovereign wealth fund" OR "private equity" OR "capital expenditure" OR "cross-border investment")',
  },
  {
    key: "economy",
    label: "Economy & markets",
    category: Category.ECONOMY_MARKETS,
    region: Region.WORLD,
    query:
      '(GDP OR inflation OR "interest rate decision" OR "Federal Reserve" OR "European Central Bank" OR recession OR "bond yields")',
  },
  {
    key: "trade",
    label: "Trade",
    category: Category.TRADE_IMPORT_EXPORT,
    region: Region.WORLD,
    query:
      '(tariffs OR "export controls" OR "trade war" OR "free trade agreement" OR "supply chain" OR WTO OR sanctions)',
  },
  {
    key: "geopolitics",
    label: "Geopolitics",
    category: Category.GEOPOLITICS,
    region: Region.WORLD,
    query:
      '("bilateral talks" OR "foreign policy" OR "security pact" OR "strategic partnership" OR NATO OR G7 OR "United Nations")',
  },
];

/** Every archive query, both desks. */
export const ARCHIVE_QUERIES: ArchiveQuery[] = [
  ...INDIA_ARCHIVE_QUERIES,
  ...WORLD_ARCHIVE_QUERIES,
];

// Google News indexes plenty of hosts that aren't newsrooms — corporate blogs,
// social platforms, SEO content farms. Anything matching these is dropped,
// since an unattributable headline is worse than no headline.
const PUBLISHER_DENYLIST = [
  "linkedin",
  "facebook",
  "twitter",
  "youtube",
  "reddit",
  "quora",
  "medium",
  "blogspot",
  "wordpress",
  "slideshare",
  "scribd",
  "pinterest",
  "instagram",
  "telegram",
  "wikipedia",
  "airtel",
  "jagran josh",
  "testbook",
  "byju",
  "unacademy",
  "vedantu",
  "adda247",
  "studyiq",
  "drishti",
  "careers360",
  "prnewswire",
  "globenewswire",
  "businesswire",
  "openpr",
  "issuewire",
  "ein presswire",
];

function isUsablePublisher(publisher: string): boolean {
  const lower = publisher.toLowerCase();
  return !PUBLISHER_DENYLIST.some((bad) => lower.includes(bad));
}

// Google News appends " - Publisher" to every headline; strip it so titles
// read cleanly next to the separate publisher byline the UI renders.
function stripPublisherSuffix(title: string, publisher: string): string {
  const suffix = ` - ${publisher}`;
  return title.endsWith(suffix) ? title.slice(0, -suffix.length).trim() : title.trim();
}

export type GoogleNewsWindow = {
  /** Inclusive lower bound, as `after:` accepts it. */
  after: Date;
  /** Exclusive upper bound, as `before:` accepts it. */
  before: Date;
};

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Google News personalises results by edition, so the desk decides which one
// to read: the India edition surfaces Indian outlets first, the US edition
// surfaces global wires.
const EDITIONS: Record<Region, { hl: string; gl: string; ceid: string }> = {
  INDIA: { hl: "en-IN", gl: "IN", ceid: "IN:en" },
  WORLD: { hl: "en-US", gl: "US", ceid: "US:en" },
};

export function buildFeedUrl(
  query: string,
  region: Region,
  window?: GoogleNewsWindow
): string {
  const dated = window
    ? `${query} after:${isoDay(window.after)} before:${isoDay(window.before)}`
    : query;
  const params = new URLSearchParams({ q: dated, ...EDITIONS[region] });
  return `${ENDPOINT}?${params.toString()}`;
}

export async function fetchGoogleNews(
  query: string,
  region: Region,
  window?: GoogleNewsWindow
): Promise<RawArticle[]> {
  const xml = await fetchFeedXml(buildFeedUrl(query, region, window));
  const feed = await parser.parseString(xml);

  const articles: RawArticle[] = [];
  for (const item of feed.items ?? []) {
    const publisher = (item.sourceTag ?? "").trim();
    if (!item.title || !item.link || !publisher) continue;
    if (!isUsablePublisher(publisher)) continue;

    const title = stripPublisherSuffix(stripHtml(item.title), publisher);
    if (!title) continue;

    articles.push({
      title,
      // Google News descriptions are just an anchor tag repeating the
      // headline, so there is no real excerpt to salvage here.
      excerpt: "",
      url: item.link,
      publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
      publisher: truncate(publisher, 120),
    });
  }
  return articles;
}
