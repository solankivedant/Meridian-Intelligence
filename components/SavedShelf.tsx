"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bookmark, Check, Copy, Download, Trash2 } from "lucide-react";
import { ArticleGrid } from "./ArticleGrid";
import type { FeedArticle } from "./ArticleRow";
import { clearSaved, savedToMarkdown, useSavedStories, type SavedStory } from "@/lib/saved";
import { useHydrated } from "@/lib/clientStore";

/**
 * The reading list, rendered entirely from the browser's own copy.
 *
 * No query runs for this page. The stories were snapshotted when they were
 * saved, so the shelf works on a plane, and a story that has since aged out of
 * the archive is still here. It reuses the feed's own grid rather than
 * inventing a second card, which is what keeps a saved story looking like the
 * story the reader saved.
 */
export function SavedShelf() {
  const stories = useSavedStories();
  const hydrated = useHydrated();

  const articles = useMemo(() => stories.map(toFeedArticle), [stories]);

  // Before hydration there is nothing to show and no way to know whether there
  // will be, so the shelf holds a quiet placeholder rather than flashing the
  // empty state at every reader who has a full list.
  if (!hydrated) {
    return (
      <div className="flex flex-col gap-3" aria-hidden>
        {Array.from({ length: 3 }, (_, i) => (
          <span
            key={i}
            className="block h-24 border"
            style={{ borderColor: "var(--rule)", backgroundColor: "var(--ink-wash)" }}
          />
        ))}
      </div>
    );
  }

  if (stories.length === 0) return <EmptyShelf />;

  return (
    <div className="flex flex-col gap-5">
      <ShelfToolbar stories={stories} />
      <ArticleGrid articles={articles} startIndex={1} />
    </div>
  );
}

function ShelfToolbar({ stories }: { stories: SavedStory[] }) {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  // A destructive button that fires on the first click is a button that gets
  // misclicked; the second click has to be a deliberate one.
  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(timer);
  }, [confirming]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(savedToMarkdown(stories));
      setCopied(true);
    } catch {
      /* clipboard refused — the download below is the fallback path */
    }
  }

  function download() {
    const blob = new Blob([savedToMarkdown(stories)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `saved-stories-${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    // Revoking immediately can race the download in Safari; a tick is enough.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div
      data-noprint
      className="flex flex-wrap items-center gap-x-2 gap-y-2 border-b pb-3"
      style={{ borderColor: "var(--rule)" }}
    >
      <span className="meta mr-auto">{stories.length.toLocaleString("en-IN")} saved</span>
      <ToolbarButton
        onClick={copy}
        icon={copied ? Check : Copy}
        accent={copied ? "var(--cat-economy)" : undefined}
      >
        {copied ? "Copied as markdown" : "Copy as markdown"}
      </ToolbarButton>
      <ToolbarButton onClick={download} icon={Download}>
        Download .md
      </ToolbarButton>
      <ToolbarButton
        onClick={() => {
          if (confirming) {
            clearSaved();
            setConfirming(false);
          } else setConfirming(true);
        }}
        icon={Trash2}
        accent={confirming ? "var(--cat-geopolitics)" : undefined}
      >
        {confirming ? "Tap again to clear all" : "Clear list"}
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  onClick,
  icon: Icon,
  accent,
  children,
}: {
  onClick: () => void;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="kicker inline-flex items-center gap-1.5 border px-2.5 py-1.5 text-[9px] transition-colors hover:bg-[var(--ink-wash)]"
      style={{
        borderColor: accent ?? "var(--rule-strong)",
        color: accent ?? "var(--text-secondary)",
      }}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {children}
    </button>
  );
}

function EmptyShelf() {
  return (
    <div className="flex flex-col items-start gap-3 py-6">
      <Bookmark className="h-6 w-6 text-[var(--text-muted)]" aria-hidden />
      <p className="measure text-[15px] leading-relaxed text-[var(--text-secondary)]">
        Nothing saved yet. Every story in the feed carries a <strong>Save</strong>{" "}
        control in its byline — or press <Key>S</Key> with a story focused. The list
        lives in this browser alone: no account, nothing sent anywhere, and it works
        offline once saved.
      </p>
      <Link
        href="/"
        className="kicker border px-3 py-1.5 text-[10px] text-[var(--text-primary)] transition-colors hover:bg-[var(--ink-wash)]"
        style={{ borderColor: "var(--rule-strong)" }}
      >
        Back to the India desk
      </Link>
    </div>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="meta mx-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center border px-1 text-[10px] text-[var(--text-primary)]"
      style={{ borderColor: "var(--rule-strong)" }}
    >
      {children}
    </kbd>
  );
}

/**
 * A saved snapshot back into the shape the feed's card expects. Excerpt and
 * tags were never stored — they cost storage and add nothing to a list the
 * reader has already chosen to keep.
 */
function toFeedArticle(story: SavedStory): FeedArticle {
  return {
    id: story.id,
    title: story.title,
    excerpt: "",
    url: story.url,
    category: story.category,
    tags: [],
    publishedAt: new Date(story.publishedAt),
    source: { name: story.sourceName },
  };
}
