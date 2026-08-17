import { titleKey } from "./ingestion/dedupe";

/**
 * Returns the excerpt only when it adds something the headline doesn't.
 *
 * Regulator feeds (SEBI, parts of RBI) put the headline back in the
 * description field verbatim, so rendering both printed the same sentence
 * twice under a display headline. Anything that merely restates the title is
 * treated as having no deck at all.
 */
export function deck(title: string, excerpt: string): string | null {
  const trimmed = excerpt.trim();
  if (trimmed.length < 40) return null;

  const headline = titleKey(title);
  const body = titleKey(trimmed);
  if (body === headline) return null;
  if (headline.length > 0 && body.startsWith(headline.slice(0, Math.min(headline.length, 80)))) {
    return null;
  }

  return trimmed;
}
