export type TimeRangeKey = "24h" | "7d" | "1m" | "3m" | "1y" | "all";

export const TIME_RANGES: { key: TimeRangeKey; label: string; days: number | null }[] = [
  { key: "24h", label: "24h", days: 1 },
  { key: "7d", label: "7d", days: 7 },
  { key: "1m", label: "1m", days: 30 },
  { key: "3m", label: "3m", days: 90 },
  { key: "1y", label: "1y", days: 365 },
  { key: "all", label: "All", days: null },
];

const DEFAULT_RANGE: TimeRangeKey = "7d";

/**
 * The active window, in words.
 *
 * The pulse and the coverage strip both have to say what period they describe,
 * and "last 24 hours" hard-coded into a panel that now follows the feed's own
 * filters is exactly the kind of caption that quietly starts lying.
 */
export function windowLabel(range: TimeRangeKey, month?: string): string {
  if (month) {
    return MONTH_OPTION_LABELS.get(month) ?? month;
  }
  switch (range) {
    case "24h":
      return "last 24 hours";
    case "7d":
      return "last 7 days";
    case "1m":
      return "last month";
    case "3m":
      return "last 3 months";
    case "1y":
      return "last year";
    default:
      return "the whole archive";
  }
}

export function isTimeRangeKey(value: string | undefined): value is TimeRangeKey {
  return !!value && TIME_RANGES.some((r) => r.key === value);
}

export function normalizeRange(value: string | undefined): TimeRangeKey {
  return isTimeRangeKey(value) ? value : DEFAULT_RANGE;
}

/** Cutoff `hours` before now. Lives here so pages stay free of clock reads. */
export function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

export function rangeCutoff(key: TimeRangeKey): Date | undefined {
  const range = TIME_RANGES.find((r) => r.key === key);
  if (!range || range.days === null) return undefined;
  return new Date(Date.now() - range.days * 24 * 60 * 60 * 1000);
}

// Browse-by-month: a dedicated picker separate from the relative ranges above.
// The window rolls with the calendar and matches how far back the Google News
// archive crawl reaches (see scripts/backfill.ts), so every listed month can
// actually have stories behind it.
const MONTH_PICKER_MONTHS_BACK = 23;

function pickerStart(): { year: number; month: number } {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - MONTH_PICKER_MONTHS_BACK, 1)
  );
  return { year: start.getUTCFullYear(), month: start.getUTCMonth() + 1 };
}

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export type MonthOption = { key: string; label: string };

export function monthOptions(): MonthOption[] {
  const now = new Date();
  const end = { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };

  const options: MonthOption[] = [];
  let { year, month } = pickerStart();
  while (year < end.year || (year === end.year && month <= end.month)) {
    options.push({
      key: `${year}-${String(month).padStart(2, "0")}`,
      label: `${MONTH_LABELS[month - 1]} ${year}`,
    });
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }
  // Most recent month first - that's the one people want to browse most often.
  return options.reverse();
}

const MONTH_KEY_PATTERN = /^(\d{4})-(\d{2})$/;

export function isValidMonthKey(value: string | undefined): value is string {
  if (!value) return false;
  const match = MONTH_KEY_PATTERN.exec(value);
  if (!match) return false;
  return monthOptions().some((m) => m.key === value);
}

export function monthDateRange(monthKey: string): { gte: Date; lt: Date } {
  const [year, month] = monthKey.split("-").map(Number);
  const gte = new Date(Date.UTC(year, month - 1, 1));
  const lt = new Date(Date.UTC(month === 12 ? year + 1 : year, month % 12, 1));
  return { gte, lt };
}

/** Month keys to their display labels, for `windowLabel`. */
const MONTH_OPTION_LABELS = new Map(monthOptions().map((option) => [option.key, option.label]));
