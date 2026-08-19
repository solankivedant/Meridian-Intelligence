import { Category, Region, SourceType } from "@/lib/enums";

export type RawArticle = {
  title: string;
  excerpt: string;
  url: string;
  publishedAt: Date;
  // Set only by aggregator sources (Google News), where the item's real
  // publisher differs from the feed it arrived on. Ingestion attributes the
  // article to this publisher instead of the aggregator.
  publisher?: string;
};

export type SourceConfig = {
  name: string;
  url: string;
  type: SourceType;
  defaultCategory: Category;
  region: Region;
  // When true, articles that don't hit any explicit categorize() keyword rule
  // are dropped instead of falling back to defaultCategory. Use this for
  // broad, general-purpose sources (news APIs spanning many categories) so
  // off-topic items (crime, celebrity/political-campaign news, etc.) don't
  // pollute the dashboard's scoped categories.
  strict?: boolean;
};

/** A source entry before its desk is stamped on - see sources.ts. */
export type SourceDefinition = Omit<SourceConfig, "region">;
