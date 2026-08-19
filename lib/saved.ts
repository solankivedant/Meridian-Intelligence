"use client";

import { Category } from "./enums";
import { metaForCategory } from "./categoryMeta";
import { readStored, updateStored, useStored, writeStored } from "./clientStore";
import { STORAGE_KEYS } from "./storageKeys";

/**
 * The reading list.
 *
 * What's stored is a *snapshot* of the story, not a reference to it: title,
 * link, publisher, section, date. Storing ids alone would make /saved a page
 * that can't render without a round trip, and would quietly lose an item the
 * day its row leaves the archive. A saved story is the reader's copy - it
 * keeps working offline, and it survives whatever happens upstream.
 */

const SAVED_KEY = STORAGE_KEYS.saved;

/** Stable identity for `useStored`; never mutated. */
const NONE: SavedStory[] = [];

export type SavedStory = {
  id: string;
  title: string;
  url: string;
  sourceName: string;
  category: Category;
  /** ISO 8601 - Date objects don't survive a JSON round trip. */
  publishedAt: string;
  savedAt: number;
};

export function useSavedStories(): SavedStory[] {
  return useStored(SAVED_KEY, NONE);
}

export function useIsSaved(id: string): boolean {
  return useSavedStories().some((story) => story.id === id);
}

/** Returns the state the story is now in, so a caller can announce it. */
export function toggleSaved(story: Omit<SavedStory, "savedAt">): boolean {
  const existing = readStored(SAVED_KEY, NONE);
  const saved = existing.some((entry) => entry.id === story.id);
  updateStored<SavedStory[]>(SAVED_KEY, NONE, (prev) =>
    saved
      ? prev.filter((entry) => entry.id !== story.id)
      : // Newest first: the shelf reads as a stack, most recent on top.
        [{ ...story, savedAt: Date.now() }, ...prev]
  );
  return !saved;
}

export function removeSaved(id: string): void {
  updateStored<SavedStory[]>(SAVED_KEY, NONE, (prev) => prev.filter((entry) => entry.id !== id));
}

export function clearSaved(): void {
  writeStored<SavedStory[]>(SAVED_KEY, []);
}

/**
 * The shelf as a document.
 *
 * A reading list that can only be read in the tab that made it is a dead end;
 * grouped markdown is the format that pastes into a note, a brief or an email
 * without reformatting, which is what this list is actually for.
 */
export function savedToMarkdown(stories: SavedStory[]): string {
  const stamp = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const lines = [`# Saved stories`, ``, `_${stories.length} stories · exported ${stamp}_`, ``];

  // Section order follows the palette order used everywhere else, so an export
  // reads in the same order as the site's own navigation.
  const sections = new Map<Category, SavedStory[]>();
  for (const story of stories) {
    const bucket = sections.get(story.category);
    if (bucket) bucket.push(story);
    else sections.set(story.category, [story]);
  }

  for (const [category, group] of sections) {
    lines.push(`## ${metaForCategory(category).label}`, ``);
    for (const story of group) {
      const date = new Date(story.publishedAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      lines.push(`- [${story.title}](${story.url}) - ${story.sourceName}, ${date}`);
    }
    lines.push(``);
  }

  return lines.join("\n");
}
