/**
 * Every key this site writes to `localStorage`, in one place.
 *
 * Deliberately free of `"use client"`. The pre-paint script in
 * `components/PreferencesScript.tsx` is server-rendered, and a value imported
 * from a client module into a server component arrives as a client *reference*
 * rather than the string itself - which silently compiled into a script that
 * read key `undefined` and defaulted every reader back to the light theme.
 * Plain constants in a plain module are readable from both sides.
 *
 * The `pbe:` prefix namespaces the site's data against anything else served
 * from the same origin, and the names are stable: renaming one is a silent
 * reset of that record for every existing reader.
 */
export const STORAGE_KEYS = {
  theme: "pbe:theme",
  density: "pbe:density",
  mutedSources: "pbe:muted",
  recentSearches: "pbe:recent",
  readLog: "pbe:read",
  lastVisit: "pbe:visit",
  liked: "pbe:liked",
} as const;
