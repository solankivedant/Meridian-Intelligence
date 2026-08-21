import { MAX_QUERY_LENGTH } from "./searchLimits";

/**
 * What the words of a query are, and what else they might have been written as.
 *
 * Deliberately free of any database import. The query builder needs these and
 * so does the highlighter, and the highlighter runs in the browser - putting
 * them in `lib/search.ts` would drag Prisma into the masthead's bundle.
 *
 * ---
 *
 * The reason this module exists at all: Postgres indexes *lexemes*, and a
 * search term is matched against the front of one. "Semiconductor" is a single
 * lexeme, so `conductor:*` can never reach inside it - which meant a reader who
 * typed "semi conductor" got only the stories that happened to also contain a
 * separate word starting with "conductor", and the ones actually about
 * semiconductors matched on "semi" alone. The words were being checked
 * individually against a text that had joined them together.
 *
 * So a query is expanded into the several ways the same request could have been
 * written, and any of them counts as a match. "semi conductor" asks for
 * `(semi & conductor)` *or* `semiconductor`; "electric vehicle policy" also
 * asks for `(electricvehicle & policy)` and `(electric & vehiclepolicy)`.
 * Splitting the other way - "semiconductor" finding "semi conductor" - is not
 * attempted, because knowing where a compound comes apart needs a dictionary
 * rather than a rule.
 */

/** Enough variants to cover how people actually write compounds, and no more. */
const MAX_VARIANTS = 6;

/** Beyond this the joins are combinatorial and nobody typed a compound anyway. */
const MAX_GLUE_TERMS = 5;

/**
 * Every token in a query, single letters included.
 *
 * `to_tsquery` throws on stray operators and a thrown query is a 500, so the
 * reduction to alphanumerics is a safety boundary as well as a tokenizer.
 */
function queryTokens(input: string): string[] {
  return input
    .slice(0, MAX_QUERY_LENGTH)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8);
}

/**
 * The words worth searching for on their own.
 *
 * A single letter is dropped: on its own it matches a sizeable fraction of the
 * archive and says nothing about what the reader wanted. It is kept for
 * *gluing* though - see `termVariants` - because "e commerce" and "i phone" are
 * exactly the queries where the letter is the half that matters.
 */
export function queryTerms(input: string): string[] {
  const tokens = queryTokens(input);
  const words = tokens.filter((token) => token.length > 1);
  // Unless that leaves nothing at all, in which case a one-letter search is
  // still better than no search.
  return words.length > 0 ? words : tokens;
}

/**
 * The same request, written the several ways it could have been written.
 *
 * The first entry is always the words exactly as typed; the rest glue one
 * adjacent pair together, and - for three or more words - the whole phrase.
 * A caller treats them as alternatives: match any one of these and the story
 * answers the question that was asked.
 */
export function termVariants(input: string): string[][] {
  const tokens = queryTokens(input);
  const terms = queryTerms(input);
  if (terms.length === 0) return [];
  if (tokens.length < 2) return [terms];

  const variants: string[][] = [terms];
  const seen = new Set([terms.join(" ")]);

  const add = (variant: string[]) => {
    const key = variant.join(" ");
    if (seen.has(key) || variants.length >= MAX_VARIANTS) return;
    seen.add(key);
    variants.push(variant);
  };

  // Gluing works off the raw tokens, so the single letter dropped above is
  // back in play here and "e commerce" can reach "ecommerce".
  if (tokens.length <= MAX_GLUE_TERMS) {
    // One adjacent pair joined, each pair in turn - the case that matters is
    // two words, where this is simply the compound.
    for (let i = 0; i < tokens.length - 1; i++) {
      add([...tokens.slice(0, i), tokens[i] + tokens[i + 1], ...tokens.slice(i + 2)]);
    }
    // And the whole thing as one word, for "e commerce policy" style queries.
    if (tokens.length > 2) add([tokens.join("")]);
  }

  return variants;
}

/**
 * Every word worth marking in a result, including the compounds a story may
 * have used instead. Longest first is handled by the highlighter, so
 * "semiconductor" wins the mark over "semi".
 */
export function allTermForms(input: string): string[] {
  // Single letters are dropped from the marking: a lone "e" highlighted in
  // every "the" on the page is noise, not an answer.
  return [...new Set(termVariants(input).flat())].filter((term) => term.length > 1);
}
