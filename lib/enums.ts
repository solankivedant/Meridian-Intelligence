/**
 * Hand-written mirrors of the Prisma enums in `prisma/schema.prisma`.
 *
 * Importing an enum *value* (e.g. `Category.POLICY_REGULATORY`) from
 * "@prisma/client" pulls the generated client into whatever bundle the file
 * ends up in. In a client component that means `@prisma/client/index-browser`,
 * which is a build-time hard failure. These are plain const objects, so any
 * file — server or client — can import them for free.
 *
 * The types are the same string-literal unions Prisma generates, so values
 * from here are accepted anywhere a Prisma enum is expected. Keep in sync with
 * the schema.
 */

export const Category = {
  POLICY_REGULATORY: "POLICY_REGULATORY",
  SUBSIDY_SCHEME: "SUBSIDY_SCHEME",
  BUSINESS_STARTUP: "BUSINESS_STARTUP",
  TECH_INNOVATION: "TECH_INNOVATION",
  ECONOMY_MARKETS: "ECONOMY_MARKETS",
  INVESTMENT_FDI: "INVESTMENT_FDI",
  TRADE_IMPORT_EXPORT: "TRADE_IMPORT_EXPORT",
  GEOPOLITICS: "GEOPOLITICS",
} as const;

export type Category = (typeof Category)[keyof typeof Category];

export const Region = {
  INDIA: "INDIA",
  WORLD: "WORLD",
} as const;

export type Region = (typeof Region)[keyof typeof Region];

export const SourceType = {
  RSS: "RSS",
  API: "API",
  SCRAPE: "SCRAPE",
} as const;

export type SourceType = (typeof SourceType)[keyof typeof SourceType];
