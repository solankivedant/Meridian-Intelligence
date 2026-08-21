"use client";

import { readStored, updateStored, useStored } from "./clientStore";
import { STORAGE_KEYS } from "./storageKeys";

/**
 * Which stories this browser has liked.
 *
 * The count itself is global and lives in the database (`app/api/like`); this
 * is only the local half - a list of ids, so the button can show that it has
 * already been pressed and can be pressed again to take the like back. It is
 * deliberately ids and nothing else: unlike the reading list this replaced,
 * there is no page listing them, so a snapshot of each story would be stored
 * for nobody to read.
 *
 * With no accounts, this is also the only thing stopping one reader liking a
 * story twice. Clearing site data resets it, and a second device is a second
 * like. That is the price of a like button without a sign-in, and the number
 * is a rough measure of interest rather than a count of people.
 */

const LIKED_KEY = STORAGE_KEYS.liked;

/** Stable identity for `useStored`; never mutated. */
const NONE: string[] = [];

export function useLikedIds(): string[] {
  return useStored(LIKED_KEY, NONE);
}

export function useIsLiked(id: string): boolean {
  return useLikedIds().includes(id);
}

/**
 * Records the press locally and returns the state the story is now in, so the
 * caller can send the matching delta to the server.
 */
export function toggleLikedLocally(id: string): boolean {
  const liked = readStored(LIKED_KEY, NONE).includes(id);
  updateStored<string[]>(LIKED_KEY, NONE, (prev) =>
    liked ? prev.filter((entry) => entry !== id) : [...prev, id]
  );
  return !liked;
}

/** Puts the local list back the way it was after a failed write. */
export function revertLike(id: string, likedBefore: boolean): void {
  updateStored<string[]>(LIKED_KEY, NONE, (prev) => {
    const without = prev.filter((entry) => entry !== id);
    return likedBefore ? [...without, id] : without;
  });
}

/**
 * Sends the press to the shared counter.
 *
 * Returns the server's new total, or null if the write did not land - the
 * caller has an optimistic number on screen either way and needs to know
 * whether to keep it.
 */
export async function recordLike(id: string, liked: boolean): Promise<number | null> {
  try {
    const res = await fetch("/api/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, liked }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { likes?: number };
    return typeof data.likes === "number" ? data.likes : null;
  } catch {
    // Offline, or the request was cancelled by a navigation. Either way the
    // caller rolls the button back rather than reporting a like that isn't
    // there.
    return null;
  }
}
