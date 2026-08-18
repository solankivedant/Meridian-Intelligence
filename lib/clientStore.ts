"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * The one place this app talks to `localStorage`.
 *
 * Everything a reader accumulates without an account — what they've read, what
 * they've saved, how they want the page to look — lives here. Two things make
 * that harder than `localStorage.getItem`:
 *
 *  - *Hydration.* The server has no idea what's in the reader's browser, so the
 *    first client render has to produce exactly the markup the server sent and
 *    only then swap in the stored value. `useSyncExternalStore` does this
 *    properly: it renders `getServerSnapshot` through hydration and re-renders
 *    once afterwards, which is a repaint rather than a mismatch.
 *
 *  - *Sharing.* A save button in a card, the count in the masthead and the
 *    shelf on /saved are three components reading one value. Without a
 *    subscription they drift apart until the next navigation, so every write
 *    notifies every reader of that key — including readers in other tabs, via
 *    the `storage` event.
 *
 * Values are JSON. `fallback` must be a stable reference (a module constant,
 * not a literal in the component body) or the snapshot cache churns.
 */

/** Parsed values, keyed by storage key — `getSnapshot` must be referentially stable. */
const parsed = new Map<string, unknown>();
/** The raw string each cached value was parsed from, so foreign writes invalidate it. */
const rawCache = new Map<string, string | null>();
const listeners = new Map<string, Set<() => void>>();

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    // Private-browsing modes and blocked third-party storage both throw here.
    // A reader who can't persist preferences should still get a working page.
    return null;
  }
}

function emit(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

let bridged = false;

/** Mirrors writes made by other tabs into this one. Installed on first use. */
function bridgeOtherTabs() {
  if (bridged || typeof window === "undefined") return;
  bridged = true;
  window.addEventListener("storage", (event) => {
    if (!event.key) {
      // The whole store was cleared — every cached key is now stale.
      rawCache.clear();
      parsed.clear();
      listeners.forEach((set) => set.forEach((listener) => listener()));
      return;
    }
    emit(event.key);
  });
}

export function readStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = readRaw(key);
  if (!parsed.has(key) || rawCache.get(key) !== raw) {
    rawCache.set(key, raw);
    let value = fallback;
    if (raw !== null) {
      try {
        value = JSON.parse(raw) as T;
      } catch {
        value = fallback;
      }
    }
    parsed.set(key, value);
  }
  return parsed.get(key) as T;
}

export function writeStored<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(value);
  try {
    window.localStorage.setItem(key, raw);
  } catch {
    /* quota or blocked storage — the value still lives in memory for this page */
  }
  rawCache.set(key, raw);
  parsed.set(key, value);
  emit(key);
}

export function updateStored<T>(key: string, fallback: T, update: (prev: T) => T): T {
  const next = update(readStored(key, fallback));
  writeStored(key, next);
  return next;
}

function subscribe(key: string, listener: () => void): () => void {
  bridgeOtherTabs();
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(listener);
  return () => {
    set.delete(listener);
  };
}

/** Read-only view of a stored value, kept in step with every other reader. */
export function useStored<T>(key: string, fallback: T): T {
  return useSyncExternalStore(
    useCallback((listener: () => void) => subscribe(key, listener), [key]),
    () => readStored(key, fallback),
    () => fallback
  );
}

/**
 * False on the server and through hydration, true immediately after.
 *
 * For the handful of places that can't render a neutral state — a control whose
 * label *is* the stored value — this is the honest way to hold off one frame.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}
