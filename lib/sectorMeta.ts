import { TAG_META, tagLabel } from "@/lib/categorize";
import {
  Anchor,
  BatteryCharging,
  Banknote,
  CandlestickChart,
  BrainCircuit,
  Building2,
  Car,
  CircuitBoard,
  Code,
  Construction,
  CreditCard,
  Factory,
  Fuel,
  Pickaxe,
  Pill,
  RadioTower,
  Recycle,
  Rocket,
  Satellite,
  Shield,
  Shirt,
  Sprout,
  Store,
  Truck,
  UtensilsCrossed,
  Wind,
  Tag,
  type LucideIcon,
} from "lucide-react";

/**
 * A face for each of the 25 sector tags.
 *
 * The sections have had a colour and an icon since the palette was set; the
 * sectors have only ever been text, which is why a list of twenty-five of them
 * reads as a wall. An icon is what makes a sector recognisable before it is
 * read - it is the same recognition the section dots already give the feed.
 *
 * The hues come from a twelve-swatch family rather than twenty-five arbitrary
 * ones. Twenty-five distinguishable hues do not exist at this size, and the
 * icon is what identifies a sector; colour is here to group related industries
 * (everything energy is green, everything moving physical goods is slate) and
 * to keep a chip from being grey. Kept separate from the `--cat-*` scale on
 * purpose: those eight hues *mean* a section, and reusing them for sectors
 * would make the two legends collide.
 */
export type SectorMeta = {
  key: string;
  label: string;
  colorVar: string;
  icon: LucideIcon;
};

type Face = { colorVar: string; icon: LucideIcon };

const FACES: Record<string, Face> = {
  "renewable-energy": { colorVar: "--sec-green", icon: Wind },
  sustainability: { colorVar: "--sec-lime", icon: Recycle },
  semiconductors: { colorVar: "--sec-indigo", icon: CircuitBoard },
  ai: { colorVar: "--sec-teal", icon: BrainCircuit },
  "electric-vehicles": { colorVar: "--sec-green", icon: BatteryCharging },
  space: { colorVar: "--sec-indigo", icon: Satellite },
  defence: { colorVar: "--sec-red", icon: Shield },
  manufacturing: { colorVar: "--sec-orange", icon: Factory },
  agriculture: { colorVar: "--sec-lime", icon: Sprout },
  "pharma-healthcare": { colorVar: "--sec-purple", icon: Pill },
  fintech: { colorVar: "--sec-sky", icon: CreditCard },
  banking: { colorVar: "--sec-sky", icon: Banknote },
  "finance-stocks": { colorVar: "--sec-amber", icon: CandlestickChart },
  "real-estate": { colorVar: "--sec-amber", icon: Building2 },
  telecom: { colorVar: "--sec-purple", icon: RadioTower },
  "ports-shipping": { colorVar: "--sec-slate", icon: Anchor },
  logistics: { colorVar: "--sec-slate", icon: Truck },
  msme: { colorVar: "--sec-orange", icon: Store },
  "startups-vc": { colorVar: "--sec-magenta", icon: Rocket },
  textiles: { colorVar: "--sec-magenta", icon: Shirt },
  "steel-mining": { colorVar: "--sec-brown", icon: Pickaxe },
  automobiles: { colorVar: "--sec-amber", icon: Car },
  "it-software": { colorVar: "--sec-teal", icon: Code },
  "food-fmcg": { colorVar: "--sec-lime", icon: UtensilsCrossed },
  "oil-gas": { colorVar: "--sec-brown", icon: Fuel },
  infrastructure: { colorVar: "--sec-slate", icon: Construction },
};

/** Anything stored against a tag this file has never heard of still renders. */
const FALLBACK: Face = { colorVar: "--sec-slate", icon: Tag };

// Derived from TAG_META rather than restated, so a sector added to
// lib/categorize.ts cannot silently go missing here - it appears with the
// fallback face until it is given one.
export const SECTOR_META: SectorMeta[] = TAG_META.map((tag) => ({
  key: tag.key,
  label: tag.label,
  ...(FACES[tag.key] ?? FALLBACK),
}));

const BY_KEY = new Map(SECTOR_META.map((meta) => [meta.key, meta]));

/** The face for a sector key, synthesised for unknown keys rather than thrown. */
export function metaForSector(key: string): SectorMeta {
  const known = BY_KEY.get(key);
  if (known) return known;
  return { key, label: tagLabel(key), ...FALLBACK };
}
