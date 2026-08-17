import { Category, SourceType } from "@prisma/client";
import { SourceConfig } from "./types";

// RSS sources confirmed to serve valid, English-language feeds directly over
// plain HTTP (no session/JS required). Each entry was fetch-tested; feeds that
// 403 (NDTV Profit direct, Zee Biz, Invest India), 404, or emit malformed XML
// (Financial Express, MEA, DGFT) are deliberately absent — re-test before
// adding any of them back.
//
// `defaultCategory` only applies when categorize() finds no keyword match, so
// feeds are pointed at the category their off-keyword items most plausibly
// belong to. Broad, general-interest feeds carry `strict` instead (see below).
export const RSS_SOURCES: SourceConfig[] = [
  // ---- Government / regulator (primary sources) ----
  {
    name: "PIB Press Releases",
    url: "https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3",
    type: SourceType.RSS,
    defaultCategory: Category.POLICY_REGULATORY,
  },
  {
    name: "RBI Press Releases",
    url: "https://www.rbi.org.in/pressreleases_rss.xml",
    type: SourceType.RSS,
    defaultCategory: Category.ECONOMY_MARKETS,
  },
  {
    name: "RBI Notifications",
    url: "https://www.rbi.org.in/notifications_rss.xml",
    type: SourceType.RSS,
    defaultCategory: Category.POLICY_REGULATORY,
  },
  {
    name: "SEBI Updates",
    url: "https://www.sebi.gov.in/sebirss.xml",
    type: SourceType.RSS,
    defaultCategory: Category.POLICY_REGULATORY,
  },
  {
    name: "PM India",
    url: "https://www.pmindia.gov.in/en/feed/",
    type: SourceType.RSS,
    defaultCategory: Category.POLICY_REGULATORY,
  },

  // ---- Economy & policy desks ----
  {
    name: "Economic Times - Economy",
    url: "https://economictimes.indiatimes.com/news/economy/rssfeeds/1373380680.cms",
    type: SourceType.RSS,
    defaultCategory: Category.ECONOMY_MARKETS,
  },
  {
    name: "Business Standard - Economy & Policy",
    url: "https://www.business-standard.com/rss/economy-policy-102.rss",
    type: SourceType.RSS,
    defaultCategory: Category.POLICY_REGULATORY,
  },
  {
    name: "BusinessLine - Economy",
    url: "https://www.thehindubusinessline.com/economy/feeder/default.rss",
    type: SourceType.RSS,
    defaultCategory: Category.ECONOMY_MARKETS,
  },
  {
    name: "BusinessLine - Economic Policy",
    url: "https://www.thehindubusinessline.com/economy/policy/feeder/default.rss",
    type: SourceType.RSS,
    defaultCategory: Category.POLICY_REGULATORY,
  },
  {
    name: "The Hindu - Economy",
    url: "https://www.thehindu.com/business/Economy/feeder/default.rss",
    type: SourceType.RSS,
    defaultCategory: Category.ECONOMY_MARKETS,
  },
  {
    name: "Mint - Economy",
    url: "https://www.livemint.com/rss/economy",
    type: SourceType.RSS,
    defaultCategory: Category.ECONOMY_MARKETS,
  },
  {
    name: "Moneycontrol - Economy",
    url: "https://www.moneycontrol.com/rss/economy.xml",
    type: SourceType.RSS,
    defaultCategory: Category.ECONOMY_MARKETS,
  },

  // ---- Markets ----
  {
    name: "Economic Times - Markets",
    url: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
    type: SourceType.RSS,
    defaultCategory: Category.ECONOMY_MARKETS,
  },
  {
    name: "Business Standard - Markets",
    url: "https://www.business-standard.com/rss/markets-106.rss",
    type: SourceType.RSS,
    defaultCategory: Category.ECONOMY_MARKETS,
  },
  {
    name: "Mint - Markets",
    url: "https://www.livemint.com/rss/markets",
    type: SourceType.RSS,
    defaultCategory: Category.ECONOMY_MARKETS,
  },
  {
    name: "Business Standard - Finance",
    url: "https://www.business-standard.com/rss/finance-103.rss",
    type: SourceType.RSS,
    defaultCategory: Category.ECONOMY_MARKETS,
  },

  // ---- Industry & companies ----
  {
    name: "Economic Times - Industry",
    url: "https://economictimes.indiatimes.com/industry/rssfeeds/13352306.cms",
    type: SourceType.RSS,
    defaultCategory: Category.BUSINESS_STARTUP,
  },
  {
    name: "Business Standard - Companies",
    url: "https://www.business-standard.com/rss/companies-101.rss",
    type: SourceType.RSS,
    defaultCategory: Category.BUSINESS_STARTUP,
  },
  {
    name: "BusinessLine - Companies",
    url: "https://www.thehindubusinessline.com/companies/feeder/default.rss",
    type: SourceType.RSS,
    defaultCategory: Category.BUSINESS_STARTUP,
  },
  {
    name: "Mint - Companies",
    url: "https://www.livemint.com/rss/companies",
    type: SourceType.RSS,
    defaultCategory: Category.BUSINESS_STARTUP,
  },
  {
    name: "Business Today",
    url: "https://www.businesstoday.in/rssfeeds/?id=225346",
    type: SourceType.RSS,
    defaultCategory: Category.BUSINESS_STARTUP,
  },
  {
    name: "NDTV Profit",
    url: "https://feeds.feedburner.com/ndtvprofit-latest",
    type: SourceType.RSS,
    defaultCategory: Category.BUSINESS_STARTUP,
  },

  // ---- MSME & startups ----
  {
    name: "Economic Times - SME",
    url: "https://economictimes.indiatimes.com/small-biz/rssfeeds/5575607.cms",
    type: SourceType.RSS,
    defaultCategory: Category.BUSINESS_STARTUP,
  },
  {
    name: "Inc42",
    url: "https://inc42.com/feed/",
    type: SourceType.RSS,
    defaultCategory: Category.BUSINESS_STARTUP,
  },
  {
    name: "YourStory",
    url: "https://yourstory.com/feed",
    type: SourceType.RSS,
    defaultCategory: Category.BUSINESS_STARTUP,
  },

  // ---- Tech ----
  {
    name: "Economic Times - Tech",
    url: "https://economictimes.indiatimes.com/tech/rssfeeds/13357270.cms",
    type: SourceType.RSS,
    defaultCategory: Category.TECH_INNOVATION,
  },
  {
    name: "Business Standard - Technology",
    url: "https://www.business-standard.com/rss/technology-108.rss",
    type: SourceType.RSS,
    defaultCategory: Category.TECH_INNOVATION,
  },
  {
    name: "Mint - Technology",
    url: "https://www.livemint.com/rss/technology",
    type: SourceType.RSS,
    defaultCategory: Category.TECH_INNOVATION,
  },
  {
    name: "The Hindu - Technology",
    url: "https://www.thehindu.com/sci-tech/technology/feeder/default.rss",
    type: SourceType.RSS,
    defaultCategory: Category.TECH_INNOVATION,
  },
  {
    name: "TechCrunch - India",
    url: "https://techcrunch.com/tag/india/feed/",
    type: SourceType.RSS,
    defaultCategory: Category.TECH_INNOVATION,
  },

  // ---- Broad desks: high volume, low topical precision, so `strict` drops
  // anything that doesn't hit an explicit category keyword. ----
  {
    name: "Economic Times - Top Stories",
    url: "https://economictimes.indiatimes.com/rssfeedstopstories.cms",
    type: SourceType.RSS,
    defaultCategory: Category.ECONOMY_MARKETS,
  },
  {
    name: "The Hindu - Business",
    url: "https://www.thehindu.com/business/feeder/default.rss",
    type: SourceType.RSS,
    defaultCategory: Category.BUSINESS_STARTUP,
  },
  {
    name: "Moneycontrol - Business",
    url: "https://www.moneycontrol.com/rss/business.xml",
    type: SourceType.RSS,
    defaultCategory: Category.BUSINESS_STARTUP,
  },
  {
    name: "Indian Express - Business",
    url: "https://indianexpress.com/section/business/feed/",
    type: SourceType.RSS,
    defaultCategory: Category.BUSINESS_STARTUP,
    strict: true,
  },
  {
    name: "Indian Express - India",
    url: "https://indianexpress.com/section/india/feed/",
    type: SourceType.RSS,
    defaultCategory: Category.POLICY_REGULATORY,
    strict: true,
  },
];

export const NEWSDATA_SOURCE: SourceConfig = {
  name: "NewsData.io - India Business",
  url: "https://newsdata.io/api/1/news",
  type: SourceType.API,
  defaultCategory: Category.BUSINESS_STARTUP,
  // Broad news API spanning far more than business/policy — only keep items
  // that explicitly match one of our category keyword rules.
  strict: true,
};

// Names of sources this app configures directly, used by /sources to separate
// them from publishers discovered through the Google News archive crawl.
export const CONFIGURED_SOURCE_NAMES = new Set(
  [...RSS_SOURCES, NEWSDATA_SOURCE].map((s) => s.name)
);
