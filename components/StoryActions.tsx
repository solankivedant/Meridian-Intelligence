"use client";

import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck, Check, Link2, Share2 } from "lucide-react";
import { Category } from "@/lib/enums";
import { toggleSaved, useIsSaved } from "@/lib/saved";
import { ASK_ENABLED } from "@/lib/features";
import { AskArticleButton } from "./AskArticleButton";

export type StoryRef = {
  id: string;
  title: string;
  url: string;
  sourceName: string;
  category: Category;
  /** ISO 8601 — this crosses into a client component, where Dates are noise. */
  publishedAt: string;
};

/**
 * The three things a reader can do with a story that aren't "read it": keep
 * it, pass it on, or ask about it.
 *
 * They sit together at the end of the byline as icons at metadata size. A row
 * of labelled buttons under every headline would compete with the headline;
 * the point of a feed is the headlines, and these are meant to be found on the
 * story you've already stopped at rather than shouted at every story you
 * haven't.
 */
export function StoryActions({
  story,
  reveal = false,
}: {
  story: StoryRef;
  /** Keep the cluster out of the way until the card is hovered or focused. */
  reveal?: boolean;
}) {
  const saved = useIsSaved(story.id);
  // A saved story wears its bookmark permanently — hiding the one control that
  // reports state would make the list feel like it had forgotten the story.
  const hide = reveal && !saved;

  return (
    <span
      className={`flex items-center gap-2.5 transition-opacity ${
        hide ? "sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100" : ""
      }`}
      data-noprint
    >
      <SaveButton story={story} />
      <ShareButton title={story.title} url={story.url} />
      {/* Off on public deployments — see lib/features.ts. Save and share cost
          nothing per reader; this one calls a paid API on every click. */}
      {ASK_ENABLED && <AskArticleButton articleId={story.id} title={story.title} />}
    </span>
  );
}

function SaveButton({ story }: { story: StoryRef }) {
  const saved = useIsSaved(story.id);
  const Icon = saved ? BookmarkCheck : Bookmark;

  return (
    <button
      type="button"
      onClick={() => toggleSaved(story)}
      aria-pressed={saved}
      title={saved ? "Remove from your reading list" : "Save to your reading list"}
      className="kicker inline-flex items-center gap-1 text-[10px] transition-colors"
      style={{ color: saved ? "var(--cat-subsidy)" : "var(--text-muted)" }}
    >
      <Icon className="h-3 w-3" aria-hidden />
      <span className="hidden sm:inline">{saved ? "Saved" : "Save"}</span>
      <span className="sr-only sm:hidden">
        {saved ? "Remove from reading list" : "Save to reading list"}
      </span>
    </button>
  );
}

/**
 * Share where the browser has a share sheet, copy where it doesn't.
 *
 * `navigator.share` only exists on phones and only over HTTPS, and it throws
 * when the reader dismisses the sheet — which is not an error, just a "no".
 * Everywhere else the useful thing is the link on the clipboard with the
 * headline attached, so it can be pasted into a message as-is.
 */
function ShareButton({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  // Feature detection in an effect, not in render: the server has no
  // `navigator`, and a button that changed shape during hydration would flicker.
  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  async function pass() {
    if (canShare) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Dismissed, or the sheet refused — fall through to the clipboard so
        // the button always does something.
      }
    }
    try {
      await navigator.clipboard.writeText(`${title} — ${url}`);
      setCopied(true);
    } catch {
      // No clipboard permission. Opening the link is a poor substitute, so
      // say nothing rather than doing something surprising.
    }
  }

  const Icon = copied ? Check : canShare ? Share2 : Link2;

  return (
    <button
      type="button"
      onClick={pass}
      title={canShare ? "Share this story" : "Copy headline and link"}
      className="kicker inline-flex items-center gap-1 text-[10px] transition-colors"
      style={{ color: copied ? "var(--cat-economy)" : "var(--text-muted)" }}
    >
      <Icon className="h-3 w-3" aria-hidden />
      <span className="hidden sm:inline">{copied ? "Copied" : canShare ? "Share" : "Copy"}</span>
      <span className="sr-only sm:hidden">Copy headline and link</span>
    </button>
  );
}
