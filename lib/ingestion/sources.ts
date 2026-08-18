import { Category, Region, SourceType } from "@/lib/enums";
import { SourceConfig, SourceDefinition } from "./types";

const C = Category;

// Every feed below was fetch-tested. Endpoints that 401/403/404 (WSJ, IMF,
// World Bank, Reuters Agency, NDTV Profit direct, Zee Biz) or emit malformed
// XML (Financial Express, The Print, Scroll, Firstpost, AP News, Down To Earth)
// are deliberately absent — re-test before adding any of them back.
//
// `defaultCategory` only applies when categorize() finds no keyword match, so
// feeds point at the category their off-keyword items most plausibly belong to.
// Broad, general-interest feeds carry `strict` instead.
function feed(
  name: string,
  url: string,
  defaultCategory: Category,
  options: { strict?: boolean } = {}
): SourceDefinition {
  return { name, url, type: SourceType.RSS, defaultCategory, strict: options.strict };
}

/** Stamps a desk onto a list, so region cannot be forgotten on a new entry. */
function desk(region: Region, definitions: SourceDefinition[]): SourceConfig[] {
  return definitions.map((definition) => ({ ...definition, region }));
}

export const INDIA_RSS_SOURCES: SourceConfig[] = desk(Region.INDIA, [
  // ---- Government / regulator (primary sources) ----
  feed("PIB Press Releases", "https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3", C.POLICY_REGULATORY),
  feed("RBI Press Releases", "https://www.rbi.org.in/pressreleases_rss.xml", C.ECONOMY_MARKETS),
  feed("RBI Notifications", "https://www.rbi.org.in/notifications_rss.xml", C.POLICY_REGULATORY),
  feed("SEBI Updates", "https://www.sebi.gov.in/sebirss.xml", C.POLICY_REGULATORY),
  feed("PM India", "https://www.pmindia.gov.in/en/feed/", C.POLICY_REGULATORY),

  // ---- Economy & policy desks ----
  feed("Economic Times - Economy", "https://economictimes.indiatimes.com/news/economy/rssfeeds/1373380680.cms", C.ECONOMY_MARKETS),
  feed("Business Standard - Economy & Policy", "https://www.business-standard.com/rss/economy-policy-102.rss", C.POLICY_REGULATORY),
  feed("BusinessLine - Economy", "https://www.thehindubusinessline.com/economy/feeder/default.rss", C.ECONOMY_MARKETS),
  feed("BusinessLine - Economic Policy", "https://www.thehindubusinessline.com/economy/policy/feeder/default.rss", C.POLICY_REGULATORY),
  feed("The Hindu - Economy", "https://www.thehindu.com/business/Economy/feeder/default.rss", C.ECONOMY_MARKETS),
  feed("Mint - Economy", "https://www.livemint.com/rss/economy", C.ECONOMY_MARKETS),
  feed("Mint - Politics", "https://www.livemint.com/rss/politics", C.POLICY_REGULATORY),
  feed("Moneycontrol - Economy", "https://www.moneycontrol.com/rss/economy.xml", C.ECONOMY_MARKETS),
  feed("CNBC-TV18 - Economy", "https://www.cnbctv18.com/commonfeeds/v1/cne/rss/economy.xml", C.ECONOMY_MARKETS),

  // ---- Markets & finance ----
  feed("Economic Times - Markets", "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms", C.ECONOMY_MARKETS),
  feed("Business Standard - Markets", "https://www.business-standard.com/rss/markets-106.rss", C.ECONOMY_MARKETS),
  feed("Business Standard - Finance", "https://www.business-standard.com/rss/finance-103.rss", C.ECONOMY_MARKETS),
  feed("Mint - Markets", "https://www.livemint.com/rss/markets", C.ECONOMY_MARKETS),
  feed("Mint - Money", "https://www.livemint.com/rss/money", C.ECONOMY_MARKETS),
  feed("BusinessLine - Markets", "https://www.thehindubusinessline.com/markets/feeder/default.rss", C.ECONOMY_MARKETS),
  feed("BusinessLine - Money & Banking", "https://www.thehindubusinessline.com/money-and-banking/feeder/default.rss", C.ECONOMY_MARKETS),
  feed("Economic Times - Banking & Finance", "https://economictimes.indiatimes.com/industry/banking/finance/rssfeeds/13358259.cms", C.ECONOMY_MARKETS),
  feed("Moneycontrol - Results", "https://www.moneycontrol.com/rss/results.xml", C.BUSINESS_STARTUP),

  // ---- Industry & companies ----
  feed("Economic Times - Industry", "https://economictimes.indiatimes.com/industry/rssfeeds/13352306.cms", C.BUSINESS_STARTUP),
  feed("Economic Times - Energy", "https://economictimes.indiatimes.com/industry/energy/rssfeeds/13358350.cms", C.TECH_INNOVATION),
  feed("Economic Times - Auto", "https://economictimes.indiatimes.com/industry/auto/rssfeeds/13359412.cms", C.BUSINESS_STARTUP),
  feed("Economic Times - Pharma & Biotech", "https://economictimes.indiatimes.com/industry/healthcare/biotech/rssfeeds/13358050.cms", C.TECH_INNOVATION),
  feed("Business Standard - Companies", "https://www.business-standard.com/rss/companies-101.rss", C.BUSINESS_STARTUP),
  feed("Business Standard - Industry", "https://www.business-standard.com/rss/industry-217.rss", C.BUSINESS_STARTUP),
  feed("BusinessLine - Companies", "https://www.thehindubusinessline.com/companies/feeder/default.rss", C.BUSINESS_STARTUP),
  feed("Mint - Companies", "https://www.livemint.com/rss/companies", C.BUSINESS_STARTUP),
  feed("Mint - Industry", "https://www.livemint.com/rss/industry", C.BUSINESS_STARTUP),
  feed("The Hindu - Industry", "https://www.thehindu.com/business/Industry/feeder/default.rss", C.BUSINESS_STARTUP),
  feed("Business Today", "https://www.businesstoday.in/rssfeeds/?id=225346", C.BUSINESS_STARTUP),
  feed("NDTV Profit", "https://feeds.feedburner.com/ndtvprofit-latest", C.BUSINESS_STARTUP),
  feed("CNBC-TV18 - Business", "https://www.cnbctv18.com/commonfeeds/v1/cne/rss/business.xml", C.BUSINESS_STARTUP),
  feed("Mercom India - Clean Energy", "https://mercomindia.com/feed", C.TECH_INNOVATION),

  // ---- MSME & startups ----
  feed("Economic Times - SME", "https://economictimes.indiatimes.com/small-biz/rssfeeds/5575607.cms", C.BUSINESS_STARTUP),
  feed("Inc42", "https://inc42.com/feed/", C.BUSINESS_STARTUP),
  feed("YourStory", "https://yourstory.com/feed", C.BUSINESS_STARTUP),

  // ---- Tech ----
  feed("Economic Times - Tech", "https://economictimes.indiatimes.com/tech/rssfeeds/13357270.cms", C.TECH_INNOVATION),
  feed("Business Standard - Technology", "https://www.business-standard.com/rss/technology-108.rss", C.TECH_INNOVATION),
  feed("Mint - Technology", "https://www.livemint.com/rss/technology", C.TECH_INNOVATION),
  feed("BusinessLine - Info Tech", "https://www.thehindubusinessline.com/info-tech/feeder/default.rss", C.TECH_INNOVATION),
  feed("The Hindu - Technology", "https://www.thehindu.com/sci-tech/technology/feeder/default.rss", C.TECH_INNOVATION),
  feed("TechCrunch - India", "https://techcrunch.com/tag/india/feed/", C.TECH_INNOVATION),
  feed("MediaNama - Tech Policy", "https://www.medianama.com/feed/", C.POLICY_REGULATORY),

  // ---- Defence & external affairs ----
  feed("Business Standard - External Affairs & Defence", "https://www.business-standard.com/rss/external-affairs-defence-security-115.rss", C.GEOPOLITICS),

  // ---- Broad desks: high volume, low topical precision, so strict mode drops
  // anything that does not hit an explicit category keyword. ----
  feed("Economic Times - Top Stories", "https://economictimes.indiatimes.com/rssfeedstopstories.cms", C.ECONOMY_MARKETS),
  feed("The Hindu - Business", "https://www.thehindu.com/business/feeder/default.rss", C.BUSINESS_STARTUP),
  feed("Moneycontrol - Business", "https://www.moneycontrol.com/rss/business.xml", C.BUSINESS_STARTUP),
  feed("Times of India - Business", "https://timesofindia.indiatimes.com/rssfeeds/1898055.cms", C.BUSINESS_STARTUP),
  feed("Hindustan Times - Business", "https://www.hindustantimes.com/feeds/rss/business/rssfeed.xml", C.BUSINESS_STARTUP),
  feed("India Today - Business", "https://www.indiatoday.in/rss/1206514", C.BUSINESS_STARTUP),
  feed("Mint - News", "https://www.livemint.com/rss/news", C.POLICY_REGULATORY, { strict: true }),
  feed("Indian Express - Business", "https://indianexpress.com/section/business/feed/", C.BUSINESS_STARTUP, { strict: true }),
  feed("Indian Express - India", "https://indianexpress.com/section/india/feed/", C.POLICY_REGULATORY, { strict: true }),
  feed("Hindustan Times - India", "https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml", C.POLICY_REGULATORY, { strict: true }),
  feed("The Hindu - National", "https://www.thehindu.com/news/national/feeder/default.rss", C.POLICY_REGULATORY, { strict: true }),
]);

// The world desk covers the same eight categories from outside India. Global
// wires carry a lot of politics and human interest that is not business news,
// so the general-news feeds here are all strict.
export const WORLD_RSS_SOURCES: SourceConfig[] = desk(Region.WORLD, [
  // ---- Global business & economy ----
  feed("BBC News - Business", "https://feeds.bbci.co.uk/news/business/rss.xml", C.ECONOMY_MARKETS),
  feed("The Guardian - Business", "https://www.theguardian.com/uk/business/rss", C.ECONOMY_MARKETS),
  feed("The Economist - Finance & Economics", "https://www.economist.com/finance-and-economics/rss.xml", C.ECONOMY_MARKETS),
  feed("The Economist - Business", "https://www.economist.com/business/rss.xml", C.BUSINESS_STARTUP),
  feed("CNBC - Economy", "https://www.cnbc.com/id/20910258/device/rss/rss.html", C.ECONOMY_MARKETS),
  feed("CNBC - Finance", "https://www.cnbc.com/id/10001147/device/rss/rss.html", C.ECONOMY_MARKETS),
  feed("The New York Times - Business", "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml", C.BUSINESS_STARTUP),
  feed("MarketWatch - Top Stories", "https://feeds.content.dowjones.io/public/rss/mw_topstories", C.ECONOMY_MARKETS),
  feed("Investing.com", "https://www.investing.com/rss/news.rss", C.ECONOMY_MARKETS),
  feed("Financial Times", "https://www.ft.com/rss/home", C.ECONOMY_MARKETS),

  // ---- Trade & institutions ----
  feed("WTO News", "https://www.wto.org/library/rss/latest_news_e.xml", C.TRADE_IMPORT_EXPORT),
  feed("OilPrice.com", "https://oilprice.com/rss/main", C.TRADE_IMPORT_EXPORT),

  // ---- Global tech ----
  feed("TechCrunch", "https://techcrunch.com/feed/", C.TECH_INNOVATION),
  feed("The Verge", "https://www.theverge.com/rss/index.xml", C.TECH_INNOVATION),
  feed("Ars Technica", "https://arstechnica.com/feed/", C.TECH_INNOVATION),

  // ---- Geopolitics: broad wires, filtered hard ----
  feed("BBC News - World", "https://feeds.bbci.co.uk/news/world/rss.xml", C.GEOPOLITICS, { strict: true }),
  feed("The Guardian - World", "https://www.theguardian.com/world/rss", C.GEOPOLITICS, { strict: true }),
  feed("Al Jazeera", "https://www.aljazeera.com/xml/rss/all.xml", C.GEOPOLITICS, { strict: true }),
  feed("The New York Times - World", "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", C.GEOPOLITICS, { strict: true }),
]);

export const RSS_SOURCES: SourceConfig[] = [...INDIA_RSS_SOURCES, ...WORLD_RSS_SOURCES];

export const NEWSDATA_SOURCE: SourceConfig = {
  name: "NewsData.io - India Business",
  url: "https://newsdata.io/api/1/news",
  type: SourceType.API,
  defaultCategory: Category.BUSINESS_STARTUP,
  region: Region.INDIA,
  // Broad news API spanning far more than business/policy — only keep items
  // that explicitly match one of our category keyword rules.
  strict: true,
};

export const ALL_CONFIGURED_SOURCES: SourceConfig[] = [...RSS_SOURCES, NEWSDATA_SOURCE];

// Names of sources this app configures directly, used by /sources to separate
// them from publishers discovered through the Google News archive crawl.
export const CONFIGURED_SOURCE_NAMES = new Set(ALL_CONFIGURED_SOURCES.map((s) => s.name));
