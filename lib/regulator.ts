import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { Category, Region } from "@/lib/enums";

/**
 * What India's regulators actually did, as opposed to what was written about
 * them.
 *
 * The RBI's and SEBI's own feeds are already ingested, and both are then
 * flattened into `POLICY_REGULATORY` alongside every ministry press release
 * and every newspaper's coverage of them. That loses the two things a
 * regulatory item carries that an ordinary policy story does not: *what kind
 * of instrument it is*, and *who it binds*.
 *
 * The difference is not academic. A consultation paper invites comment and
 * changes nothing; a master direction is binding from a stated date; a penalty
 * order concerns one named firm and sets a precedent for the rest. Reading
 * them as one undifferentiated stream is how a compliance deadline gets missed
 * behind a discussion draft.
 *
 * ## What this can and cannot see
 *
 * It classifies headlines, so it sees the regulator, the instrument type and
 * the audience named in the title. It does not read the notification itself,
 * so it cannot tell you the effective date or the operative change - that is
 * document intelligence, and it is a much larger project (see `futurescope.md`
 * #15). What this gives you is the shape of the flow: who is issuing, how
 * often, of what kind, and at whom.
 *
 * Classified at read time behind a cache, for the same reasons as
 * `lib/issuance.ts` - one page consumes it, and the rules will move while the
 * desk is young.
 */

export type Regulator = {
  key: string;
  /** Short form, as headlines write it. */
  short: string;
  name: string;
  /** What it regulates, in one line. */
  remit: string;
  colorVar: string;
  /** Phrases that identify it in a headline. */
  aliases: string[];
};

export const REGULATORS: Regulator[] = [
  { key: "rbi", short: "RBI", name: "Reserve Bank of India", remit: "Banks, NBFCs, payments and monetary policy", colorVar: "--cat-economy", aliases: ["RBI", "Reserve Bank of India", "Reserve Bank"] },
  { key: "sebi", short: "SEBI", name: "Securities and Exchange Board of India", remit: "Listed companies, brokers, mutual funds and the exchanges", colorVar: "--cat-policy", aliases: ["SEBI", "Securities and Exchange Board"] },
  { key: "irdai", short: "IRDAI", name: "Insurance Regulatory and Development Authority", remit: "Insurers, intermediaries and policyholder protection", colorVar: "--cat-investment", aliases: ["IRDAI", "IRDA", "Insurance Regulatory and Development Authority"] },
  { key: "trai", short: "TRAI", name: "Telecom Regulatory Authority of India", remit: "Telecom operators, tariffs and spectrum use", colorVar: "--sec-purple", aliases: ["TRAI", "Telecom Regulatory Authority"] },
  { key: "cci", short: "CCI", name: "Competition Commission of India", remit: "Mergers, dominance and anti-competitive conduct", colorVar: "--cat-geopolitics", aliases: ["CCI", "Competition Commission"] },
  { key: "dgft", short: "DGFT", name: "Directorate General of Foreign Trade", remit: "Export and import policy, licensing and incentives", colorVar: "--cat-trade", aliases: ["DGFT", "Directorate General of Foreign Trade"] },
  { key: "cbic", short: "CBIC", name: "Central Board of Indirect Taxes and Customs", remit: "Customs duty, GST administration and trade facilitation", colorVar: "--cat-trade", aliases: ["CBIC", "Central Board of Indirect Taxes"] },
  { key: "cbdt", short: "CBDT", name: "Central Board of Direct Taxes", remit: "Income tax administration and rules", colorVar: "--cat-subsidy", aliases: ["CBDT", "Central Board of Direct Taxes"] },
  { key: "gst-council", short: "GST Council", name: "GST Council", remit: "GST rates, slabs and exemptions", colorVar: "--cat-subsidy", aliases: ["GST Council"] },
  { key: "pfrda", short: "PFRDA", name: "Pension Fund Regulatory and Development Authority", remit: "NPS, pension funds and their intermediaries", colorVar: "--sec-teal", aliases: ["PFRDA", "Pension Fund Regulatory"] },
  { key: "ibbi", short: "IBBI", name: "Insolvency and Bankruptcy Board of India", remit: "Insolvency resolution, liquidation and professionals", colorVar: "--sec-brown", aliases: ["IBBI", "Insolvency and Bankruptcy Board"] },
  { key: "nclt", short: "NCLT", name: "National Company Law Tribunal", remit: "Corporate disputes, insolvency admissions and scheme approvals", colorVar: "--sec-slate", aliases: ["NCLT", "National Company Law Tribunal", "NCLAT"] },
  { key: "npci", short: "NPCI", name: "National Payments Corporation of India", remit: "UPI, RuPay, NACH and the retail payment rails", colorVar: "--sec-sky", aliases: ["NPCI", "National Payments Corporation"] },
  { key: "mca", short: "MCA", name: "Ministry of Corporate Affairs", remit: "Company law, filings and corporate governance rules", colorVar: "--cat-policy", aliases: ["Ministry of Corporate Affairs", "MCA"] },
  { key: "nfra", short: "NFRA", name: "National Financial Reporting Authority", remit: "Audit quality and accounting standards", colorVar: "--sec-indigo", aliases: ["NFRA", "National Financial Reporting Authority"] },
  { key: "ifsca", short: "IFSCA", name: "International Financial Services Centres Authority", remit: "GIFT City entities and cross-border financial services", colorVar: "--sec-magenta", aliases: ["IFSCA", "International Financial Services Centres Authority"] },
  { key: "dpiit", short: "DPIIT", name: "Dept. for Promotion of Industry and Internal Trade", remit: "FDI policy, startup recognition and industrial licensing", colorVar: "--cat-investment", aliases: ["DPIIT", "Department for Promotion of Industry"] },
  { key: "cdsco", short: "CDSCO", name: "Central Drugs Standard Control Organisation", remit: "Drug approvals, trials and manufacturing standards", colorVar: "--sec-purple", aliases: ["CDSCO", "Drugs Controller General", "DCGI"] },
  { key: "fssai", short: "FSSAI", name: "Food Safety and Standards Authority of India", remit: "Food standards, labelling and safety enforcement", colorVar: "--sec-lime", aliases: ["FSSAI", "Food Safety and Standards Authority"] },
  { key: "cerc", short: "CERC", name: "Central Electricity Regulatory Commission", remit: "Power tariffs, transmission and market operation", colorVar: "--sec-green", aliases: ["CERC", "Central Electricity Regulatory Commission"] },
  { key: "pngrb", short: "PNGRB", name: "Petroleum and Natural Gas Regulatory Board", remit: "Gas pipelines, city gas distribution and tariffs", colorVar: "--sec-brown", aliases: ["PNGRB", "Petroleum and Natural Gas Regulatory Board"] },
  { key: "bis", short: "BIS", name: "Bureau of Indian Standards", remit: "Product standards, quality control orders and certification", colorVar: "--sec-orange", aliases: ["Bureau of Indian Standards", "BIS quality control", "quality control order"] },
  { key: "epfo", short: "EPFO", name: "Employees' Provident Fund Organisation", remit: "Provident fund contributions, returns and withdrawals", colorVar: "--sec-amber", aliases: ["EPFO", "Employees Provident Fund Organisation"] },
  { key: "amfi", short: "AMFI", name: "Association of Mutual Funds in India", remit: "Mutual fund industry standards and disclosure", colorVar: "--sec-teal", aliases: ["AMFI", "Association of Mutual Funds"] },
];

const REGULATOR_BY_KEY = new Map(REGULATORS.map((regulator) => [regulator.key, regulator]));

export function regulatorByKey(key: string): Regulator | undefined {
  return REGULATOR_BY_KEY.get(key);
}

/**
 * The kind of instrument, ordered by how binding it is.
 *
 * The order is the point of the list: it is what lets the desk say "three of
 * this week's eleven items actually bind somebody, and the rest are drafts and
 * speeches". `weight` drives that split and nothing else.
 */
export type ActionKind =
  | "penalty"
  | "order"
  | "direction"
  | "notification"
  | "circular"
  | "guideline"
  | "approval"
  | "consultation"
  | "report";

export const ACTION_KINDS: {
  key: ActionKind;
  label: string;
  hint: string;
  /** True when the item changes an obligation for somebody as it stands. */
  binding: boolean;
}[] = [
  { key: "penalty", label: "Penalty", hint: "A fine or censure against a named firm", binding: true },
  { key: "order", label: "Order", hint: "A determination in a specific matter", binding: true },
  { key: "direction", label: "Master direction", hint: "Consolidated binding rules for a class of entity", binding: true },
  { key: "notification", label: "Notification", hint: "A rule brought into force", binding: true },
  { key: "circular", label: "Circular", hint: "Instruction to regulated entities", binding: true },
  { key: "guideline", label: "Guideline", hint: "Framework or norms, usually with a compliance date", binding: true },
  { key: "approval", label: "Approval", hint: "A clearance granted - a merger, a licence, a product", binding: false },
  { key: "consultation", label: "Consultation", hint: "A draft out for comment - nothing binds yet", binding: false },
  { key: "report", label: "Report & speech", hint: "Analysis, data release or remarks", binding: false },
];

const KIND_META = new Map(ACTION_KINDS.map((kind) => [kind.key, kind]));

export function actionKindMeta(kind: ActionKind) {
  return KIND_META.get(kind) ?? ACTION_KINDS[ACTION_KINDS.length - 1];
}

const KIND_RULES: { kind: ActionKind; phrases: string[] }[] = [
  { kind: "penalty", phrases: ["penalty", "penalises", "penalizes", "fines", "fined", "monetary penalty", "censure", "debars", "debarred", "bars from"] },
  // Every "draft X" form has to be listed, and this rule has to stay above
  // `direction`: "RBI unveils harmonised draft Directions on interest rates"
  // is a document out for comment that binds nobody, and matching it as a
  // direction would report the exact opposite of its legal status.
  { kind: "consultation", phrases: ["consultation paper", "discussion paper", "seeks comments", "invites comments", "for public comment", "draft norms", "draft rules", "draft guidelines", "draft directions", "draft circular", "draft framework", "draft regulations", "draft amendment", "draft scheme", "draft policy"] },
  // "Directions" plural only. RBI names its binding instruments
  // "...(Amendment) Directions, 2026", and "issues directions" is the same
  // thing in a newsroom's words - but the singular would also match "a step in
  // the right direction", which is a speech, not an instrument.
  { kind: "direction", phrases: ["master direction", "master circular", "master directions", "amendment directions", "directions"] },
  { kind: "circular", phrases: ["circular", "issues instructions"] },
  { kind: "notification", phrases: ["notification", "notifies", "notified", "gazette", "brought into force", "comes into force", "amendment regulations", "amendment rules"] },
  { kind: "guideline", phrases: ["guidelines", "framework", "norms", "regulations amended", "amendment regulations", "tightens rules", "eases rules", "relaxes norms"] },
  { kind: "approval", phrases: ["approves", "approved", "clears", "cleared", "grants licence", "grants license", "nod to", "green light"] },
  { kind: "order", phrases: ["order", "ruling", "directs", "directed", "interim order", "tribunal"] },
  { kind: "report", phrases: ["report", "bulletin", "survey", "speech", "governor said", "data release", "annual report", "study"] },
];

/**
 * Who the instrument lands on.
 *
 * The most useful column on the desk and the least reliable, because a headline
 * names its audience only when it is not obvious. An item with nothing matched
 * is shown with no audience rather than guessed at.
 */
export type Audience = {
  key: string;
  label: string;
  phrases: string[];
};

export const AUDIENCES: Audience[] = [
  { key: "banks", label: "Banks", phrases: ["banks", "bank branches", "scheduled commercial bank", "cooperative bank", "urban cooperative"] },
  { key: "nbfcs", label: "NBFCs", phrases: ["nbfc", "non-banking financial", "housing finance compan", "microfinance"] },
  { key: "amcs", label: "Mutual funds", phrases: ["mutual fund", "asset management compan", "amc", "scheme investors"] },
  { key: "brokers", label: "Brokers", phrases: ["broker", "trading member", "stock broker", "depository participant"] },
  { key: "analysts", label: "Research analysts", phrases: ["research analyst", "investment adviser", "finfluencer"] },
  { key: "insurers", label: "Insurers", phrases: ["insurer", "insurance compan", "policyholder", "reinsur"] },
  { key: "issuers", label: "Listed companies", phrases: ["listed compan", "listed entit", "issuer", "promoter", "board of directors", "disclosure requirement"] },
  { key: "payments", label: "Payment operators", phrases: ["payment aggregator", "payment gateway", "upi", "prepaid instrument", "wallet", "payment system operator"] },
  { key: "telcos", label: "Telecom operators", phrases: ["telecom operator", "telcos", "access provider", "spectrum holder"] },
  { key: "traders", label: "Exporters & importers", phrases: ["exporter", "importer", "shipping bill", "customs broker", "sez unit"] },
  { key: "startups", label: "Startups", phrases: ["startup", "dpiit-recognised", "angel investor"] },
  { key: "auditors", label: "Auditors", phrases: ["auditor", "audit firm", "chartered accountant"] },
  { key: "investors", label: "Retail investors", phrases: ["retail investor", "small investor", "demat account", "nominee", "kyc for investor"] },
  { key: "borrowers", label: "Borrowers", phrases: ["borrower", "loan account", "retail loan", "gold loan", "credit card customer"] },
];

function normalize(text: string): string {
  return ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
}

/**
 * `phrases` are matched as prefixes of a word rather than whole words, so
 * "compan" reaches "company" and "companies" from one entry. The leading space
 * is kept - that is what stops "amc" matching inside another word - but the
 * trailing boundary is deliberately not required.
 */
function hasPhrase(haystack: string, phrase: string): boolean {
  return haystack.includes(` ${normalize(phrase).trim()}`);
}

export type RegulatorAction = {
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
  regulator: Regulator;
  kind: ActionKind;
  /** Whether this item, as classified, changes anyone's obligations. */
  binding: boolean;
  audiences: { key: string; label: string }[];
};

/** How far back the tracker looks by default. */
export const REGULATOR_MONTHS = 6;

/**
 * Which regulator a story is about.
 *
 * The publisher is consulted first and the headline second, which is the
 * opposite of how `categorize()` works and is right here: an item that arrived
 * on the RBI's own feed *is* an RBI item even when the headline never says so
 * ("Monetary Policy Statement, 2026-27"), whereas a newspaper headline that
 * merely mentions the RBI may be about something else entirely.
 */
function resolveRegulator(sourceName: string, title: string, excerpt: string): Regulator | null {
  const source = normalize(sourceName);
  const fromFeed = REGULATORS.find((regulator) =>
    regulator.aliases.some((alias) => source.includes(normalize(alias)))
  );
  if (fromFeed) return fromFeed;

  // Headline before excerpt: a passing mention in the body is background.
  const head = normalize(title);
  const fromTitle = REGULATORS.find((regulator) =>
    regulator.aliases.some((alias) => head.includes(normalize(alias)))
  );
  if (fromTitle) return fromTitle;

  const body = normalize(excerpt);
  return (
    REGULATORS.find((regulator) =>
      regulator.aliases.some((alias) => body.includes(normalize(alias)))
    ) ?? null
  );
}

export function classifyAction(
  sourceName: string,
  title: string,
  excerpt: string
): { regulator: Regulator; kind: ActionKind; audiences: { key: string; label: string }[] } | null {
  const regulator = resolveRegulator(sourceName, title, excerpt);
  if (!regulator) return null;

  const head = normalize(title);
  const both = normalize(`${title} ${excerpt}`);

  // Title only, deliberately. An earlier version fell back to the excerpt when
  // the headline named no instrument, and it was consistently wrong in one
  // direction: RBI press releases carry boilerplate, so "Government Stock -
  // Full Auction Results" - a data release if anything ever was - picked up
  // "notification" from its body text and was reported as binding. A headline
  // that names no instrument is far better served by the `report` fallback
  // than by whatever word happens to appear in the excerpt.
  const kind =
    KIND_RULES.find((rule) => rule.phrases.some((phrase) => head.includes(normalize(phrase))))?.kind ??
    "report";

  const audiences = AUDIENCES.filter((audience) =>
    audience.phrases.some((phrase) => hasPhrase(both, phrase))
  ).map(({ key, label }) => ({ key, label }));

  return { regulator, kind, audiences };
}

async function computeActions(region: Region, months: number): Promise<RegulatorAction[]> {
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const names = REGULATORS.flatMap((regulator) => regulator.aliases);

  const rows = await db.article.findMany({
    where: {
      region,
      publishedAt: { gte: since },
      OR: [
        // The regulators' own feeds, whatever their headlines happen to say.
        ...REGULATORS.map((regulator) => ({
          source: { is: { name: { contains: regulator.short, mode: "insensitive" as const } } },
        })),
        ...names.map((alias) => ({ title: { contains: alias, mode: "insensitive" as const } })),
      ],
    },
    orderBy: { publishedAt: "desc" },
    include: { source: true },
    take: 4000,
  });

  return rows.flatMap((row) => {
    const classified = classifyAction(row.source.name, row.title, row.excerpt);
    if (!classified) return [];
    return [
      {
        id: row.id,
        title: row.title,
        url: row.url,
        sourceName: row.source.name,
        publishedAt: row.publishedAt.getTime(),
        category: row.category,
        regulator: classified.regulator,
        kind: classified.kind,
        binding: actionKindMeta(classified.kind).binding,
        audiences: classified.audiences,
      },
    ];
  });
}

export const getRegulatorActions = unstable_cache(computeActions, ["regulator-actions"], {
  revalidate: 900,
});

export type RegulatorSummary = {
  total: number;
  binding: number;
  byRegulator: { regulator: Regulator; count: number; binding: number }[];
  byKind: { kind: ActionKind; count: number }[];
  byAudience: { key: string; label: string; count: number }[];
};

export function summariseActions(actions: RegulatorAction[]): RegulatorSummary {
  const regulators = new Map<string, { count: number; binding: number }>();
  const kinds = new Map<ActionKind, number>();
  const audiences = new Map<string, { label: string; count: number }>();

  for (const action of actions) {
    const entry = regulators.get(action.regulator.key) ?? { count: 0, binding: 0 };
    entry.count++;
    if (action.binding) entry.binding++;
    regulators.set(action.regulator.key, entry);

    kinds.set(action.kind, (kinds.get(action.kind) ?? 0) + 1);

    for (const audience of action.audiences) {
      const found = audiences.get(audience.key) ?? { label: audience.label, count: 0 };
      found.count++;
      audiences.set(audience.key, found);
    }
  }

  return {
    total: actions.length,
    binding: actions.filter((action) => action.binding).length,
    byRegulator: [...regulators]
      .flatMap(([key, entry]) => {
        const regulator = REGULATOR_BY_KEY.get(key);
        return regulator ? [{ regulator, ...entry }] : [];
      })
      .sort((a, b) => b.count - a.count),
    // Declared order, not count order - the list is ranked by how binding the
    // instrument is, and re-sorting it by volume would throw that away.
    byKind: ACTION_KINDS.flatMap((kind) =>
      kinds.has(kind.key) ? [{ kind: kind.key, count: kinds.get(kind.key)! }] : []
    ),
    byAudience: [...audiences]
      .map(([key, entry]) => ({ key, ...entry }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12),
  };
}
