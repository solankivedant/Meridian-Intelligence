"use client";

import { useSavedStories } from "@/lib/saved";

/**
 * The number on the "Saved" tab.
 *
 * It is the only proof the shelf exists — a reader who has never opened it has
 * no reason to think the site remembers anything. Absent at zero, so an empty
 * list doesn't advertise itself, and absent until hydration, so it can never
 * contradict the server's markup.
 */
export function SavedCount() {
  const stories = useSavedStories();
  if (stories.length === 0) return null;

  return (
    <span
      className="meta inline-flex h-[16px] min-w-[16px] items-center justify-center px-1 text-[10px] leading-none"
      style={{
        color: "var(--cat-subsidy)",
        backgroundColor: "color-mix(in srgb, var(--cat-subsidy) 15%, transparent)",
      }}
      aria-label={`${stories.length} saved`}
    >
      {stories.length > 99 ? "99+" : stories.length}
    </span>
  );
}
