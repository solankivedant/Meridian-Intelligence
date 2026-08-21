/**
 * Marking, in the running text, the words a reader asked for.
 *
 * A results page that does not show *why* a story is a result makes the reader
 * scan every headline twice - once to read it, once to find their term in it.
 * Marking the hit answers that at a glance, and it is the same answer on a
 * search page, in the masthead's suggestion list and on a feed narrowed to one
 * publisher, so all three go through here.
 *
 * The mark is ink and paper inverted - a black block in the light theme, a
 * white one in the dark - rather than the usual yellow wash. Eight category
 * hues are already load-bearing on this site, and a ninth colour introduced
 * purely for search would read as a category nobody could name. See
 * `mark.search-hit` in globals.css.
 *
 * Nothing here is a client component: highlighting is a pure function of text
 * and terms, so it stays on the server for the feed and is bundled into the
 * browser only where a client component (the masthead box) needs it.
 */

/** How a term is allowed to sit inside the text it matched. */
export type MatchMode =
  /**
   * Only at the start of a word. Mirrors the archive's own `term:*` prefix
   * search, so "semicon" lights up inside "semiconductor" but "rbi" does not
   * light up inside "Serbia" - which the search would never have returned.
   */
  | "word-start"
  /**
   * Anywhere in the string. Mirrors the publisher filter's `contains`, where
   * "mint" is meant to reach "livemint.com".
   */
  | "anywhere";

/**
 * The searchable words in a query.
 *
 * Deliberately the same reduction `toTsQuery` performs in `lib/search.ts` -
 * lowercased, stripped to alphanumerics, single characters dropped, capped at
 * eight - so the words that get marked are the words that were searched. It is
 * duplicated rather than imported because `lib/search.ts` pulls in Prisma, and
 * the masthead's search box runs in the browser.
 */
export function highlightTerms(input: string): string[] {
  return [
    ...new Set(
      input
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((term) => term.length > 1)
        .slice(0, 8)
    ),
  ];
}

/** What a story should have marked in it. Absent fields are left alone. */
export type StoryHighlight = {
  /** Terms to mark in the headline and the deck. */
  text?: string[];
  /** Terms to mark in the publisher byline. */
  source?: string[];
};

const ESCAPE = /[.*+?^${}()|[\]\\]/g;

function toRegExp(terms: string[], match: MatchMode): RegExp | null {
  const cleaned = terms.map((term) => term.trim()).filter(Boolean);
  if (cleaned.length === 0) return null;

  // Longest first, so "semiconductor" wins over "semi" and the mark covers the
  // whole word the reader typed rather than its first four letters.
  const body = cleaned
    .slice()
    .sort((a, b) => b.length - a.length)
    .map((term) => term.replace(ESCAPE, "\\$&"))
    .join("|");

  return new RegExp(match === "word-start" ? `\\b(${body})` : `(${body})`, "gi");
}

/**
 * One string with its matched runs marked.
 *
 * Returns the text untouched when there is nothing to mark, so callers can pass
 * their terms unconditionally rather than branching at every call site.
 */
export function Highlight({
  text,
  terms,
  match = "word-start",
}: {
  text: string;
  terms?: string[];
  match?: MatchMode;
}): React.ReactNode {
  const pattern = terms ? toRegExp(terms, match) : null;
  if (!pattern) return text;

  // `split` on a pattern carrying exactly one capture group alternates plain
  // text and matched text, so the odd indices are precisely the hits.
  const parts = text.split(pattern);
  if (parts.length === 1) return text;

  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="search-hit">
        {part}
      </mark>
    ) : (
      part
    )
  );
}
