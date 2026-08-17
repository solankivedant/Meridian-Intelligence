// Syndication means the same story reaches us under several URLs (wire copy
// republished by a dozen outlets, plus Google News redirect links that never
// match a publisher's canonical URL). The DB's unique constraint on `url`
// can't catch those, so ingestion also compares a normalized headline.
export function titleKey(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    // Curly quotes, dashes, and stray punctuation vary between republishers.
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
