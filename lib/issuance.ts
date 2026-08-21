import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { Category, Region } from "@/lib/enums";
import { detectEntities, companyByKey } from "@/lib/entities";

/**
 * Primary issuance, read out of the headlines the archive already holds.
 *
 * Every IPO, QIP, rights issue, block deal and buyback in this dashboard
 * arrives as prose - "Company X files draft papers for Rs 2,000-crore IPO" -
 * and is then filed under Business & Startups along with everything else. The
 * information is there; what is missing is the *shape*: which company, which
 * instrument, at which stage. That is what this module recovers.
 *
 * ## Why this classifies at read time
 *
 * Sector tags and company entities are computed at ingest and stored, because
 * both are asked of every page. This is not: it feeds one page, and storing it
 * would mean a third array column, a third backfill script and a third thing
 * to keep in step with a rules file that will change often while it is young.
 * So the desk prefilters on the handful of phrases that can possibly indicate
 * an issue - a `publishedAt` bound plus title matching, both of which the
 * archive is indexed for - and classifies the survivors in memory, behind the
 * same 15-minute cache the sector desk uses.
 *
 * The cost of that choice is bounded and known: it scans titles rather than an
 * index of kinds. If the desk earns its place, promoting `kind` and `status`
 * to stored columns is a migration and a script, and nothing above this line
 * changes.
 *
 * ## Kind and status are orthogonal
 *
 * The first version of this treated "listing" as a kind, which was wrong: a
 * market debut is not a different instrument from an IPO, it is a later moment
 * in the same one. Kind is the instrument, status is where it has got to, and
 * a story that reports a debut without using the word IPO is an IPO at status
 * `listed`.
 */

export type IssuanceKind =
  | "ipo"
  | "qip"
  | "rights"
  | "ofs"
  | "block-deal"
  | "buyback"
  | "preferential"
  | "bond"
  | "delisting";

export type IssuanceStatus =
  | "filed"
  | "approved"
  | "open"
  | "allotted"
  | "listed"
  | "withdrawn"
  | "announced";

export const ISSUANCE_KINDS: {
  key: IssuanceKind;
  label: string;
  description: string;
  colorVar: string;
}[] = [
  { key: "ipo", label: "IPO", description: "First sale of shares to the public, from draft papers to debut.", colorVar: "--cat-business" },
  { key: "qip", label: "QIP", description: "Qualified institutional placement - a listed company selling fresh shares to institutions.", colorVar: "--cat-investment" },
  { key: "rights", label: "Rights issue", description: "New shares offered to existing shareholders in proportion to what they hold.", colorVar: "--cat-trade" },
  { key: "ofs", label: "Offer for sale", description: "Existing holders, often the promoter or the government, selling down on the exchange.", colorVar: "--cat-economy" },
  { key: "block-deal", label: "Block & bulk deals", description: "Large pre-negotiated trades between institutions.", colorVar: "--cat-policy" },
  { key: "buyback", label: "Buyback", description: "A company buying its own shares back from the market.", colorVar: "--cat-subsidy" },
  { key: "preferential", label: "Preferential issue", description: "Shares or warrants issued to named investors on agreed terms.", colorVar: "--cat-tech" },
  { key: "bond", label: "Bonds & NCDs", description: "Debt raised from the market rather than equity.", colorVar: "--cat-geopolitics" },
  { key: "delisting", label: "Delisting", description: "Shares being taken off the exchange.", colorVar: "--sec-slate" },
];

const KIND_META = new Map(ISSUANCE_KINDS.map((kind) => [kind.key, kind]));

export function issuanceKindMeta(kind: IssuanceKind) {
  return KIND_META.get(kind) ?? ISSUANCE_KINDS[0];
}

export const ISSUANCE_STATUSES: { key: IssuanceStatus; label: string; hint: string }[] = [
  { key: "filed", label: "Filed", hint: "Draft papers with the regulator" },
  { key: "approved", label: "Approved", hint: "Regulatory clearance received" },
  { key: "open", label: "Open", hint: "Subscription under way" },
  { key: "allotted", label: "Allotted", hint: "Shares allotted, listing pending" },
  { key: "listed", label: "Listed", hint: "Trading has begun" },
  { key: "withdrawn", label: "Withdrawn", hint: "Shelved, deferred or called off" },
  { key: "announced", label: "Announced", hint: "Reported, stage not stated" },
];

const STATUS_META = new Map(ISSUANCE_STATUSES.map((status) => [status.key, status]));

export function issuanceStatusLabel(status: IssuanceStatus): string {
  return STATUS_META.get(status)?.label ?? status;
}

/**
 * The phrases that indicate an instrument.
 *
 * Ordered by specificity, first match wins - "anchor book" has to beat the
 * bare "issue" that appears in the same sentence. Every phrase is deliberately
 * multi-word or an unambiguous initialism: "rights" alone is a civil-liberties
 * story, "issue" alone is half the archive, and "OFS" is only ever this.
 */
const KIND_RULES: { kind: IssuanceKind; phrases: string[] }[] = [
  { kind: "delisting", phrases: ["delisting", "delist from", "voluntary delisting"] },
  { kind: "buyback", phrases: ["buyback", "buy-back", "share repurchase"] },
  { kind: "block-deal", phrases: ["block deal", "bulk deal", "block trade"] },
  { kind: "qip", phrases: ["qualified institutional placement", "qip"] },
  { kind: "rights", phrases: ["rights issue", "rights offering"] },
  { kind: "ofs", phrases: ["offer for sale", "ofs", "stake sale on exchange"] },
  { kind: "preferential", phrases: ["preferential allotment", "preferential issue", "convertible warrants"] },
  {
    kind: "bond",
    phrases: [
      "non-convertible debenture",
      "non convertible debenture",
      "ncd issue",
      "bond issue",
      "bond issuance",
      "masala bond",
      "green bond",
      "perpetual bond",
      "raise via bonds",
      "raises via bonds",
      "debt issue",
    ],
  },
  {
    kind: "ipo",
    phrases: [
      "ipo",
      "initial public offering",
      "drhp",
      "draft red herring",
      "red herring prospectus",
      "public issue",
      "anchor book",
      "anchor investors",
      "grey market premium",
    ],
  },
];

/**
 * Where an issue has got to.
 *
 * Ordered late-stage first: a story is filed under the furthest point it
 * reports, because "the IPO that filed in March has now listed" is a listing
 * story, not a filing one.
 */
const STATUS_RULES: { status: IssuanceStatus; phrases: string[] }[] = [
  {
    status: "withdrawn",
    phrases: ["withdraws", "withdrawn", "shelves", "shelved", "calls off", "called off", "defers", "deferred", "scrapped"],
  },
  {
    status: "listed",
    phrases: [
      "makes market debut",
      "market debut",
      "stock market debut",
      "lists at",
      "listed at",
      "listing gains",
      "listing premium",
      "debuts on",
      "shares list",
      "lists on the",
    ],
  },
  { status: "allotted", phrases: ["allotment", "allotted", "basis of allotment"] },
  {
    status: "open",
    phrases: [
      "subscription opens",
      "opens for subscription",
      "subscribed",
      "oversubscribed",
      "bidding opens",
      "issue opens",
      "day 1 of",
      "final day",
    ],
  },
  {
    status: "approved",
    phrases: ["sebi nod", "sebi approval", "sebi approves", "gets approval", "receives approval", "cleared by sebi", "observation letter"],
  },
  {
    status: "filed",
    phrases: ["files draft", "filed draft", "files papers", "filed papers", "drhp", "draft red herring", "files for", "refiles"],
  },
  {
    status: "announced",
    phrases: ["board approves", "board approved", "plans to raise", "to raise", "announces", "approves raising"],
  },
];

/** Rs 1,200 crore / ₹2.5 lakh crore / $300 million, as written. */
const AMOUNT = /(?:rs\.?|inr|₹|\$|usd)\s?([\d,]+(?:\.\d+)?)[\s-]*(lakh crore|crore|cr\b|lakh|billion|bn\b|million|mn\b)/i;

function normalize(text: string): string {
  return ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
}

/** Phrases are normalised the same way the haystack is, then padded. */
function padded(phrase: string): string {
  return normalize(phrase);
}

/**
 * Headlines that use the vocabulary without reporting an instance of it.
 *
 * Two kinds of impostor turned up as soon as this ran over the real archive,
 * and both are the same mistake in different clothes - a story *about* the
 * mechanism rather than an occurrence of it:
 *
 *  - **US Treasury buybacks.** Indian markets desks cover them constantly, and
 *    "Treasury Buyback" is a government debt operation, not a company buying
 *    its own shares. Every buyback this desk found before this list existed
 *    was one of these.
 *  - **Explainers and rule reviews.** "India's IPO jargon decoded" and "SEBI
 *    reviewing delisting rules" are a glossary and a regulatory story. The
 *    second belongs on `/regulators`, and does appear there.
 *
 * Checked against the title before anything else, and a hit rejects the story
 * outright. Kept deliberately short: this is for phrases that are reliably not
 * an event, not a general quality filter.
 */
const EXCLUSIONS = [
  "treasury buyback",
  "treasury buybacks",
  "jargon",
  "decoded",
  "explainer",
  "ipo rules",
  "ipo norms",
  "delisting rules",
  "delisting norms",
  "buyback rules",
  "buyback norms",
];

export type Classified = { kind: IssuanceKind; status: IssuanceStatus };

/**
 * The instrument and stage a headline is reporting, or null when it is
 * reporting neither.
 *
 * The prefilter that fetches candidates is loose on purpose - it is a
 * title-only keyword net - so most of the rejection happens here, and
 * returning null is the common case rather than the error case.
 */
export function classifyIssuance(title: string, excerpt: string): Classified | null {
  // The headline decides the kind. Excerpts routinely mention a company's
  // last IPO while reporting something else entirely, and a desk built on
  // that reads as a desk that cannot tell news from background.
  const head = normalize(title);
  if (EXCLUSIONS.some((phrase) => head.includes(padded(phrase)))) return null;

  const both = normalize(`${title} ${excerpt}`);

  let kind = KIND_RULES.find((rule) => rule.phrases.some((phrase) => head.includes(padded(phrase))))?.kind;

  const status =
    STATUS_RULES.find((rule) => rule.phrases.some((phrase) => both.includes(padded(phrase))))?.status ??
    "announced";

  // A debut with no instrument named is the end of an IPO - see the note on
  // orthogonality above.
  if (!kind && status === "listed") kind = "ipo";
  if (!kind) return null;

  return { kind, status };
}

export type IssuanceEvent = {
  id: string;
  title: string;
  url: string;
  sourceName: string;
/**
 * Epoch milliseconds, not a `Date`, and this is not a style choice.
 *
 * Everything returned from `unstable_cache` goes through JSON on its way in
 * and out of the cache, so a `Date` comes back as a *string* on every hit
 * while the first, cache-cold call returns a real `Date`. That difference is
 * invisible in development until the moment `timeAgo()` is handed a string,
 * and then it fails on the second request rather than the first - which is
 * about the worst failure mode a cached read path can have. Numbers survive
 * the round trip unchanged, so the boundary is drawn here and the pages
 * revive them. `lib/opportunity.ts` does the same with `latestAt`.
 */
  publishedAt: number;
  category: Category;
  kind: IssuanceKind;
  status: IssuanceStatus;
  /** Dictionary companies named in the story, resolved to display names. */
  companies: { key: string; name: string }[];
  /** The sum as the story wrote it, e.g. "Rs 2,000 crore". Null when unstated. */
  amount: string | null;
};

/**
 * The title fragments worth fetching at all.
 *
 * This is the prefilter, not the classifier, and the two are deliberately
 * different: this list only has to be cheap and generous, because everything
 * it lets through is then judged properly by `classifyIssuance`. Keeping it
 * short keeps the query planner on the `publishedAt` index.
 */
const PREFILTER = [
  "ipo",
  "drhp",
  "public offering",
  "public issue",
  "qip",
  "placement",
  "rights issue",
  "offer for sale",
  "ofs",
  "block deal",
  "bulk deal",
  "buyback",
  "buy-back",
  "repurchase",
  "preferential",
  "debenture",
  "ncd",
  "bond",
  "delist",
  "debut",
  "lists at",
  "listing",
  "subscri",
  "allotment",
  "anchor",
];

/** How far back the desk looks by default. */
export const ISSUANCE_MONTHS = 12;

async function computeIssuance(region: Region, months: number): Promise<IssuanceEvent[]> {
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const rows = await db.article.findMany({
    where: {
      region,
      publishedAt: { gte: since },
      OR: PREFILTER.map((fragment) => ({
        title: { contains: fragment, mode: "insensitive" as const },
      })),
    },
    orderBy: { publishedAt: "desc" },
    include: { source: true },
    // A ceiling rather than a page size: the desk groups and counts, so it
    // needs the whole window, but an unbounded query over a growing archive
    // is a page that gets slower forever.
    take: 4000,
  });

  return rows.flatMap((row) => {
    const classified = classifyIssuance(row.title, row.excerpt);
    if (!classified) return [];

    // Entities are stored, so this is free for anything ingested since the
    // column landed; older rows fall back to matching on the spot, which is
    // what keeps the desk useful before `npm run entities` has been run.
    const keys = row.entities.length > 0 ? row.entities : detectEntities(row.title, row.excerpt);
    const amount = `${row.title} ${row.excerpt}`.match(AMOUNT);

    return [
      {
        id: row.id,
        title: row.title,
        url: row.url,
        sourceName: row.source.name,
        publishedAt: row.publishedAt.getTime(),
        category: row.category,
        kind: classified.kind,
        status: classified.status,
        companies: keys.flatMap((key) => {
          const company = companyByKey(key);
          return company ? [{ key, name: company.name }] : [];
        }),
        amount: amount ? `${amount[0].trim()}` : null,
      },
    ];
  });
}

export const getIssuanceEvents = unstable_cache(computeIssuance, ["issuance-events"], {
  revalidate: 900,
});

export type IssuanceSummary = {
  total: number;
  byKind: { kind: IssuanceKind; count: number }[];
  byStatus: { status: IssuanceStatus; count: number }[];
  /** Companies named across the window, most-mentioned first. */
  topCompanies: { key: string; name: string; count: number }[];
  /** Events with a company attached - the share the desk can actually name. */
  named: number;
};

export function summariseIssuance(events: IssuanceEvent[]): IssuanceSummary {
  const kinds = new Map<IssuanceKind, number>();
  const statuses = new Map<IssuanceStatus, number>();
  const companies = new Map<string, { name: string; count: number }>();
  let named = 0;

  for (const event of events) {
    kinds.set(event.kind, (kinds.get(event.kind) ?? 0) + 1);
    statuses.set(event.status, (statuses.get(event.status) ?? 0) + 1);
    if (event.companies.length > 0) named++;
    for (const company of event.companies) {
      const entry = companies.get(company.key) ?? { name: company.name, count: 0 };
      entry.count++;
      companies.set(company.key, entry);
    }
  }

  return {
    total: events.length,
    // Rendered in the declared order of ISSUANCE_KINDS rather than by count, so
    // the columns of this desk do not reshuffle themselves week to week.
    byKind: ISSUANCE_KINDS.flatMap((kind) =>
      kinds.has(kind.key) ? [{ kind: kind.key, count: kinds.get(kind.key)! }] : []
    ),
    byStatus: ISSUANCE_STATUSES.flatMap((status) =>
      statuses.has(status.key) ? [{ status: status.key, count: statuses.get(status.key)! }] : []
    ),
    topCompanies: [...companies]
      .map(([key, entry]) => ({ key, ...entry }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    named,
  };
}
