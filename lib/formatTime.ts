// The dashboard covers India, so every date the reader sees is rendered in
// IST regardless of where the server or browser sits.
const IST = "Asia/Kolkata";

export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: IST,
  });
}

/** Stable `YYYY-MM-DD` bucket in IST, used to group the feed into days. */
export function dayKey(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: IST });
}

/** `Monday, 17 August 2026` — the dateline above each day's stories. */
export function dayLabel(date: Date): string {
  const key = dayKey(date);
  const today = dayKey(new Date());
  if (key === today) return "Today";

  const yesterdayKey = dayKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
  if (key === yesterdayKey) return "Yesterday";

  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: IST,
  });
}

/** `17 Aug 2026` — compact secondary date shown beside relative labels. */
export function shortDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: IST,
  });
}

export function clockTime(date: Date): string {
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: IST,
  });
}

/** Full masthead dateline for the current moment. */
export function todayDateline(): string {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: IST,
  });
}
