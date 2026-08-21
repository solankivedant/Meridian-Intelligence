import { TAG_META } from "@/lib/categorize";

/**
 * Which traded instrument, if any, corresponds to each sector tag.
 *
 * The opportunities desk measures how loud a sector has become. The obvious
 * next question - "so what do I look at?" - has never had an answer anywhere
 * on this site, and it does not need a market-data feed to answer: the mapping
 * from an industry to the index that tracks it is a fixed, editorial fact that
 * changes about once a year.
 *
 * ## What this file is, and is not
 *
 * It is a **naming** table: sector tag to index name and exchange. It is not a
 * data feed, and it deliberately carries no symbols, levels, weights, returns
 * or fund AUM. Two reasons, and the second is the important one:
 *
 *  1. Exchange price data is licensed, and this project holds no licence.
 *  2. A ticker in a file is a fact that goes stale silently. Index names are
 *     stable and verifiable in one search; ETF symbols, expense ratios and
 *     constituents are none of those things, and a wrong one here would read
 *     as authoritative on a page that is otherwise arithmetic on our own rows.
 *
 * So `access` is written in words rather than as a list of funds, and the
 * page says plainly that this is an editorial mapping to be verified with the
 * exchange before anybody acts on it.
 *
 * ## The gaps are the point
 *
 * A third of these sectors have no index that meaningfully tracks them. That
 * is not a hole in the table - it is the single most interesting thing in it.
 * "Semiconductors is the fastest-accelerating sector on the desk and nothing
 * on either exchange tracks it" is a finding, and it is exactly the finding a
 * table of only the neat mappings would hide. `gap` records it.
 */

export type Venue = "NSE" | "BSE";

export type MarketIndex = {
  name: string;
  venue: Venue;
  /** One line on what the index actually holds, where the name misleads. */
  note?: string;
};

export type SectorBridge = {
  /** A sector key from `lib/categorize.ts`. */
  sector: string;
  indices: MarketIndex[];
  /** How the theme is reachable in practice, in words rather than tickers. */
  access: string;
  /** Set when no listed index really covers this sector. */
  gap?: string;
};

const BRIDGES: SectorBridge[] = [
  {
    sector: "banking",
    indices: [
      { name: "NIFTY Bank", venue: "NSE" },
      { name: "NIFTY Private Bank", venue: "NSE" },
      { name: "NIFTY PSU Bank", venue: "NSE" },
      { name: "BSE Bankex", venue: "BSE" },
    ],
    access:
      "The best-covered sector on either exchange. Index funds, ETFs and derivatives all exist, and the public-sector and private splits are tracked separately - which matters here, because most banking policy news moves one of those two and not the other.",
  },
  {
    sector: "finance-stocks",
    indices: [
      { name: "NIFTY Financial Services", venue: "NSE", note: "Banks, NBFCs, insurers and AMCs together - not a markets-infrastructure index." },
      { name: "BSE Finance", venue: "BSE" },
    ],
    access:
      "Broad financials are well tracked. The market-infrastructure names this sector actually collects - the exchanges, the depositories, the brokers - are scattered across broad indices rather than gathered into one.",
    gap: "No index isolates exchanges, depositories and brokers as a theme.",
  },
  {
    sector: "it-software",
    indices: [
      { name: "NIFTY IT", venue: "NSE" },
      { name: "BSE IT", venue: "BSE" },
    ],
    access:
      "Long-established, heavily traded, and concentrated: a handful of large-cap services exporters dominate the weight, so the index tracks the IT services cycle far more closely than it tracks Indian software as an industry.",
  },
  {
    sector: "pharma-healthcare",
    indices: [
      { name: "NIFTY Pharma", venue: "NSE" },
      { name: "NIFTY Healthcare Index", venue: "NSE", note: "Wider than Pharma - includes hospitals and diagnostics." },
      { name: "BSE Healthcare", venue: "BSE" },
    ],
    access:
      "Two distinct exposures worth keeping apart: drug makers, whose news is USFDA actions and pricing, and hospital chains, whose news is capacity and regulation.",
  },
  {
    sector: "automobiles",
    indices: [
      { name: "NIFTY Auto", venue: "NSE" },
      { name: "BSE Auto", venue: "BSE" },
    ],
    access: "Covers manufacturers and the larger component suppliers together.",
  },
  {
    sector: "electric-vehicles",
    indices: [
      { name: "NIFTY EV & New Age Automotive", venue: "NSE" },
    ],
    access:
      "A thematic index rather than a sector one, and young. It reaches across manufacturers, battery and charging names, so it is a far better match for this desk's EV coverage than NIFTY Auto is.",
  },
  {
    sector: "steel-mining",
    indices: [
      { name: "NIFTY Metal", venue: "NSE" },
      { name: "BSE Metal", venue: "BSE" },
    ],
    access:
      "Ferrous, non-ferrous and mining in one index. Duty changes and China's output both move it, which is why this sector's coverage spikes on trade news as readily as on production news.",
  },
  {
    sector: "oil-gas",
    indices: [
      { name: "NIFTY Oil & Gas", venue: "NSE" },
      { name: "NIFTY Energy", venue: "NSE", note: "Oil, gas and power together - not a clean-energy index." },
      { name: "BSE Oil & Gas", venue: "BSE" },
    ],
    access:
      "Well tracked, and dominated by the state refiners and one private conglomerate, so index moves often reflect a single company's news rather than the sector's.",
  },
  {
    sector: "renewable-energy",
    indices: [
      { name: "NIFTY Energy", venue: "NSE", note: "Majority oil, gas and thermal power. Not a renewables proxy." },
      { name: "BSE Power", venue: "BSE" },
      { name: "BSE Utilities", venue: "BSE" },
    ],
    access:
      "Power generation and transmission are tracked. Renewables specifically are not: the listed solar, wind and green-hydrogen names sit inside broad energy and power indices where thermal weight swamps them.",
    gap: "No index tracks Indian renewables as a theme, despite it being one of the loudest sectors on this desk.",
  },
  {
    sector: "sustainability",
    indices: [
      { name: "NIFTY100 ESG", venue: "NSE" },
      { name: "NIFTY100 Enhanced ESG", venue: "NSE" },
    ],
    access:
      "Screened versions of the large-cap universe rather than an industry. They express a constraint on what you hold, not exposure to the decarbonisation spending this sector's coverage is mostly about.",
    gap: "ESG indices screen companies; they do not track climate-transition capex.",
  },
  {
    sector: "defence",
    indices: [{ name: "NIFTY India Defence", venue: "NSE" }],
    access:
      "One of the newer thematic indices and a close match for this desk: the defence PSUs and the listed private suppliers, which is very nearly the set of companies this sector's stories name.",
  },
  {
    sector: "space",
    indices: [],
    access:
      "There is no listed space sector to track. The launch and satellite companies in this archive are private or PSU-owned, and the listed exposure runs through defence electronics and aerospace suppliers.",
    gap: "No index, and most of the sector is not listed at all.",
  },
  {
    sector: "semiconductors",
    indices: [],
    access:
      "Exposure is through individual names - the fab joint ventures' listed parents, and the electronics-manufacturing suppliers - or through global semiconductor funds, which track a different cycle entirely.",
    gap: "Nothing on either exchange tracks Indian semiconductors, in the sector this desk consistently ranks among its fastest movers.",
  },
  {
    sector: "ai",
    indices: [
      { name: "NIFTY India Digital", venue: "NSE", note: "Digital economy broadly - platforms, IT, telecom." },
      { name: "NIFTY IT", venue: "NSE" },
    ],
    access:
      "No Indian AI index exists. The closest listed proxies are the digital-economy and IT services indices, plus the data-centre and power names that the buildout actually spends on.",
    gap: "AI coverage on this desk is mostly policy and capex announcements with no tradable Indian counterpart.",
  },
  {
    sector: "manufacturing",
    indices: [
      { name: "NIFTY India Manufacturing", venue: "NSE" },
      { name: "BSE Industrials", venue: "BSE" },
      { name: "BSE Capital Goods", venue: "BSE" },
    ],
    access:
      "The manufacturing index is the closest listed counterpart to this desk's PLI and Make in India coverage, spanning autos, capital goods, chemicals and electronics.",
  },
  {
    sector: "infrastructure",
    indices: [
      { name: "NIFTY Infrastructure", venue: "NSE" },
      { name: "NIFTY India Railways PSU", venue: "NSE" },
      { name: "NIFTY PSE", venue: "NSE", note: "Public sector enterprises - where most infrastructure execution sits." },
    ],
    access:
      "Well covered, and unusually policy-driven: order inflow for most of these names is a government capex decision, which is why infrastructure coverage on this desk leads the index rather than following it.",
  },
  {
    sector: "logistics",
    indices: [{ name: "NIFTY Transportation & Logistics", venue: "NSE" }],
    access:
      "Covers airlines, road freight, rail logistics and express delivery in one index - close to this sector's own boundaries.",
  },
  {
    sector: "ports-shipping",
    indices: [
      { name: "NIFTY Transportation & Logistics", venue: "NSE", note: "Ports are a minority of the weight." },
    ],
    access:
      "Port operators and shipyards are inside the broader transport index rather than tracked separately, and two operators carry most of the listed capacity.",
    gap: "No dedicated ports or shipping index.",
  },
  {
    sector: "real-estate",
    indices: [
      { name: "NIFTY Realty", venue: "NSE" },
      { name: "BSE Realty", venue: "BSE" },
    ],
    access:
      "Listed developers are tracked. Commercial property is reachable separately through listed REITs, which the realty index does not hold.",
  },
  {
    sector: "telecom",
    indices: [
      { name: "BSE Telecommunication", venue: "BSE" },
    ],
    access:
      "Thin. Three operators, one tower company and a handful of equipment makers, and no NSE sector index - telecom exposure usually arrives inside a broader digital or Nifty 50 holding.",
    gap: "No NSE telecom index, and the listed set is small enough that any index is effectively two stocks.",
  },
  {
    sector: "food-fmcg",
    indices: [
      { name: "NIFTY FMCG", venue: "NSE" },
      { name: "NIFTY India Consumption", venue: "NSE", note: "Wider - retail, autos and services as well as staples." },
      { name: "BSE FMCG", venue: "BSE" },
    ],
    access:
      "Long-established and liquid. Rural demand and commodity input costs are what move it, and both show up in this sector's coverage well before they show up in results.",
  },
  {
    sector: "agriculture",
    indices: [
      { name: "NIFTY Commodities", venue: "NSE", note: "Holds fertiliser and agrochemical names among energy and metals." },
    ],
    access:
      "Agri-inputs - fertiliser, agrochemicals, tractors - are listed and reachable inside broad commodity and manufacturing indices. Farming itself is not listed at all, so the sector's biggest stories (MSP, monsoon, procurement) have no direct instrument.",
    gap: "No agriculture index; the listed exposure is inputs, not output.",
  },
  {
    sector: "textiles",
    indices: [],
    access:
      "The listed set is mid-cap and scattered - spinners, home textiles, branded apparel - with no index gathering them. Apparel retail is reachable through consumption indices; the export-facing mills that this sector's trade coverage is about are not.",
    gap: "No textiles index on either exchange.",
  },
  {
    sector: "msme",
    indices: [],
    access:
      "Not a tradable theme, and it is worth saying so plainly. Small-cap indices measure market capitalisation, not enterprise size, and an MSME is by definition not an index constituent. The listed connection runs the other way: the banks and NBFCs that lend to this segment.",
    gap: "Nothing tracks MSMEs, and nothing can - a listed MSME is a contradiction.",
  },
  {
    sector: "startups-vc",
    indices: [
      { name: "NIFTY India Digital", venue: "NSE", note: "The closest listed home for the new-age listings." },
    ],
    access:
      "The new-age companies that have listed sit inside digital and consumption indices rather than in one of their own. Everything pre-IPO - which is most of what this sector covers - has no listed counterpart by definition.",
    gap: "No new-age or internet index, despite a decade of listings.",
  },
  {
    sector: "fintech",
    indices: [
      { name: "NIFTY Financial Services", venue: "NSE", note: "Banks, NBFCs and insurers. Fintech is a rounding error in it." },
    ],
    access:
      "Listed fintech is a short list of payments and insurance-distribution names, individually reachable and collectively untracked. Most of the sector - the UPI apps, the lending platforms - is private.",
    gap: "No fintech index; the financial services index is a bank index in practice.",
  },
];

const BY_SECTOR = new Map(BRIDGES.map((bridge) => [bridge.sector, bridge]));

/** The bridge for one sector, or undefined where the table has no entry. */
export function bridgeForSector(sector: string): SectorBridge | undefined {
  return BY_SECTOR.get(sector);
}

/**
 * Every sector's bridge, in the sector table's own order.
 *
 * Derived from `TAG_META` rather than from `BRIDGES` so that a sector added to
 * `lib/categorize.ts` shows up here as an unmapped row rather than silently
 * vanishing from the table - the same reason `lib/sectorMeta.ts` derives its
 * list that way.
 */
export function allBridges(): { sector: string; label: string; bridge?: SectorBridge }[] {
  return TAG_META.map(({ key, label }) => ({
    sector: key,
    label,
    bridge: BY_SECTOR.get(key),
  }));
}

/** How many sectors have at least one index against them, and how many do not. */
export function bridgeCoverage(): { tracked: number; untracked: number; indices: number } {
  const all = allBridges();
  const tracked = all.filter((row) => (row.bridge?.indices.length ?? 0) > 0);
  const indices = new Set(
    all.flatMap((row) => (row.bridge?.indices ?? []).map((index) => `${index.venue} ${index.name}`))
  );
  return {
    tracked: tracked.length,
    untracked: all.length - tracked.length,
    indices: indices.size,
  };
}
