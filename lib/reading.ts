"use client";

import { readStored, updateStored, useHydrated, useStored, writeStored } from "./clientStore";
import { STORAGE_KEYS } from "./storageKeys";

/**
 * What the reader has already read, and where they left off.
 *
 * A news page's job on a second visit is different from its job on a first
 * one: the question stops being "what is here" and becomes "what is here that
 * I haven't seen". Two records answer it - the set of stories opened from this
 * browser, and the timestamp of the previous visit.
 */

const READ_KEY = STORAGE_KEYS.readLog;
const VISIT_KEY = STORAGE_KEYS.lastVisit;

/** Stable identity for `useStored`; never mutated. */
const NO_READS: ReadLog = {};

/** Story id → when it was opened. The timestamp is what makes pruning possible. */
export type ReadLog = Record<string, number>;

/**
 * The archive runs to six figures; the read log must not. Oldest entries are
 * dropped first - a story read four months ago being un-dimmed is a far
 * smaller cost than a storage quota error.
 */
const READ_LIMIT = 1500;

export function useReadLog(): ReadLog {
  return useStored(READ_KEY, NO_READS);
}

export function useIsRead(id: string): boolean {
  return useReadLog()[id] !== undefined;
}

export function markRead(id: string): void {
  updateStored<ReadLog>(READ_KEY, NO_READS, (prev) => {
    if (prev[id] !== undefined) return prev;
    const next = { ...prev, [id]: Date.now() };
    const keys = Object.keys(next);
    if (keys.length <= READ_LIMIT) return next;
    const keep = keys.sort((a, b) => next[b] - next[a]).slice(0, READ_LIMIT);
    return Object.fromEntries(keep.map((key) => [key, next[key]]));
  });
}

/** Used by "mark everything on this page as read". */
export function markManyRead(ids: string[]): void {
  updateStored<ReadLog>(READ_KEY, NO_READS, (prev) => {
    const now = Date.now();
    const next = { ...prev };
    for (const id of ids) if (next[id] === undefined) next[id] = now;
    return next;
  });
}

export function clearReadLog(): void {
  writeStored<ReadLog>(READ_KEY, {});
}

/* ---- the visit boundary ------------------------------------------------- */

type Visit = { previous: number; current: number };

/**
 * Two opens inside this window are the same visit. Without it, a reader who
 * opens a story in a tab and comes back would be told nothing is new - the
 * return would have reset the boundary to a minute ago.
 */
const SAME_VISIT_MS = 30 * 60 * 1000;

/** Resolved once per page load, so the boundary can't drift mid-read. */
let visit: Visit | null = null;

function resolveVisit(): Visit {
  if (visit) return visit;
  const now = Date.now();
  const stored = readStored<Visit | null>(VISIT_KEY, null);

  if (!stored) {
    // First visit from this browser: nothing can be new, or the reader's very
    // first page would open with every story flagged.
    visit = { previous: now, current: now };
  } else if (now - stored.current > SAME_VISIT_MS) {
    visit = { previous: stored.current, current: now };
  } else {
    visit = { previous: stored.previous, current: now };
  }
  return visit;
}

/** Called once from the layout, in an effect - resolving must not write during render. */
export function recordVisit(): void {
  writeStored(VISIT_KEY, resolveVisit());
}

/**
 * When the reader was last here, or null until hydration settles.
 *
 * Null is the neutral state every caller renders on the server: no "new"
 * flags, no banner, nothing that could differ from the markup already sent.
 */
export function useVisitBoundary(): number | null {
  const hydrated = useHydrated();
  if (!hydrated) return null;
  const { previous } = resolveVisit();
  return previous;
}

/** Whether a story landed since the reader's previous visit. */
export function useIsNew(publishedAt: string | number): boolean {
  const boundary = useVisitBoundary();
  if (boundary === null) return false;
  const at = typeof publishedAt === "number" ? publishedAt : Date.parse(publishedAt);
  return Number.isFinite(at) && at > boundary;
}
