"use client";

import { useStored, writeStored } from "./clientStore";
import { STORAGE_KEYS } from "./storageKeys";

/**
 * Display preferences — the settings that change how the page looks rather
 * than what it contains.
 *
 * Theme and density are written to `<html>` as data attributes rather than
 * threaded through components, because both have to be correct in the very
 * first painted frame — `components/PreferencesScript.tsx` reads the same keys
 * from `lib/storageKeys.ts` before React runs.
 */

const THEME_KEY = STORAGE_KEYS.theme;
const DENSITY_KEY = STORAGE_KEYS.density;
const MUTED_KEY = STORAGE_KEYS.mutedSources;
const RECENT_KEY = STORAGE_KEYS.recentSearches;

export type Theme = "system" | "light" | "dark";
export type Density = "comfortable" | "compact";

const DEFAULT_THEME: Theme = "system";
const DEFAULT_DENSITY: Density = "comfortable";
const NO_SOURCES: string[] = [];
const NO_SEARCHES: string[] = [];

export function useTheme(): Theme {
  return useStored(THEME_KEY, DEFAULT_THEME);
}

export function setTheme(theme: Theme): void {
  writeStored(THEME_KEY, theme);
  applyTheme(theme);
}

/** Resolves "system" against the OS preference and writes the result to `<html>`. */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  // Only "dark" is a real hook in the stylesheet — light is the plain :root.
  if (dark) document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.setAttribute("data-theme", "light");
}

export function useDensity(): Density {
  return useStored(DENSITY_KEY, DEFAULT_DENSITY);
}

export function setDensity(density: Density): void {
  writeStored(DENSITY_KEY, density);
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-density", density);
  }
}

/* ---- muted publishers --------------------------------------------------- */

/**
 * Sources the reader would rather not read.
 *
 * Muting *dims* rather than removes. The feed's counts, numbering and paging
 * are all computed on the server, and a client that deleted rows out of a
 * server-numbered list would produce a page claiming 40 stories while showing
 * 31. Dimming keeps the record honest and still answers the real complaint,
 * which is that one publisher's syndication is drowning out everything else.
 */
export function useMutedSources(): string[] {
  return useStored(MUTED_KEY, NO_SOURCES);
}

export function isMuted(list: string[], sourceName: string): boolean {
  return list.includes(sourceName);
}

export function toggleMutedSource(name: string): void {
  const current = readMuted();
  writeStored(
    MUTED_KEY,
    current.includes(name) ? current.filter((entry) => entry !== name) : [...current, name]
  );
}

export function unmuteAll(): void {
  writeStored<string[]>(MUTED_KEY, []);
}

function readMuted(): string[] {
  if (typeof window === "undefined") return NO_SOURCES;
  try {
    const raw = window.localStorage.getItem(MUTED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : NO_SOURCES;
  } catch {
    return NO_SOURCES;
  }
}

/* ---- recent searches ---------------------------------------------------- */

const RECENT_LIMIT = 8;

export function useRecentSearches(): string[] {
  return useStored(RECENT_KEY, NO_SEARCHES);
}

export function rememberSearch(query: string): void {
  const trimmed = query.trim();
  if (trimmed.length < 2) return;
  let current: string[] = NO_SEARCHES;
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (raw) current = JSON.parse(raw) as string[];
  } catch {
    /* unreadable store — start a fresh list */
  }
  const next = [trimmed, ...current.filter((entry) => entry !== trimmed)].slice(0, RECENT_LIMIT);
  writeStored(RECENT_KEY, next);
}

export function clearRecentSearches(): void {
  writeStored<string[]>(RECENT_KEY, []);
}
