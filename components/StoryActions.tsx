"use client";

import { useEffect, useState } from "react";
import { Check, Heart, Link2, Share2 } from "lucide-react";
import { Category } from "@/lib/enums";
import { recordLike, revertLike, toggleLikedLocally, useIsLiked } from "@/lib/likes";
import { ASK_ENABLED } from "@/lib/features";
import { AskArticleButton } from "./AskArticleButton";

export type StoryRef = {
  id: string;
  title: string;
  url: string;
  sourceName: string;
  category: Category;
  /** ISO 8601 - this crosses into a client component, where Dates are noise. */
  publishedAt: string;
  /** The shared like count as the server last rendered it. */
  likes?: number;
};

/**
 * The three things a reader can do with a story that aren't "read it": like
 * it, pass it on, or ask about it.
 *
 * They sit together at the end of the byline as icons at metadata size. A row
 * of labelled buttons under every headline would compete with the headline;
 * the point of a feed is the headlines, and these are meant to be found on the
 * story you've already stopped at rather than shouted at every story you
 * haven't.
 *
 * Liking replaced a private reading list. A saved story was worth exactly one
 * thing to one browser; a like is worth something to everyone who arrives
 * after it, which is the only reason a feed of headlines needs a button that
 * is not "open".
 */
export function StoryActions({
  story,
  reveal = false,
}: {
  story: StoryRef;
  /** Keep the cluster out of the way until the card is hovered or focused. */
  reveal?: boolean;
}) {
  const liked = useIsLiked(story.id);
  // Two reasons to keep the cluster on screen: this reader has already liked
  // the story, or other readers have. Hiding a count until hover would hide
  // the one thing on the row that came from somebody else.
  const hide = reveal && !liked && !(story.likes ?? 0);

  return (
    <span
      className={`flex items-center gap-1.5 ${hide ? "reveal-on-hover" : ""}`}
      data-noprint
    >
      <LikeButton id={story.id} likes={story.likes ?? 0} />
      <ShareButton title={story.title} url={story.url} />
      {/* Off on public deployments - see lib/features.ts. Like and share cost
          nothing per reader; this one calls a paid API on every click. */}
      {ASK_ENABLED && <AskArticleButton articleId={story.id} title={story.title} />}
    </span>
  );
}

/**
 * The like, and its running total.
 *
 * The count arrives server-rendered with the story, so the number is correct
 * for a reader who never presses anything - which is most of them. A press
 * updates it on the spot and posts the delta; the server's answer replaces the
 * guess when it lands, so a story that was liked twice while this page sat
 * open corrects itself rather than showing this reader's arithmetic. A failed
 * write rolls both the number and the button back, because a like that says it
 * worked and did not is worse than one that admits it.
 */
function LikeButton({ id, likes }: { id: string; likes: number }) {
  const liked = useIsLiked(id);
  const [delta, setDelta] = useState(0);
  const [pending, setPending] = useState(false);
  // Null until the server has spoken for this story in this session; after
  // that its number wins over the one rendered with the page.
  const [confirmed, setConfirmed] = useState<number | null>(null);

  const total = Math.max(0, (confirmed ?? likes) + (confirmed === null ? delta : 0));

  async function press() {
    if (pending) return;
    setPending(true);
    const wasLiked = liked;
    const nowLiked = toggleLikedLocally(id);
    setDelta((value) => value + (nowLiked ? 1 : -1));

    const server = await recordLike(id, nowLiked);
    if (server === null) {
      revertLike(id, wasLiked);
      setDelta((value) => value - (nowLiked ? 1 : -1));
    } else {
      setConfirmed(server);
      setDelta(0);
    }
    setPending(false);
  }

  return (
    <button
      type="button"
      onClick={press}
      aria-pressed={liked}
      title={liked ? "Take your like back" : "Like this story - everyone sees the count"}
      className="kicker inline-flex h-8 min-w-8 items-center justify-center gap-1.5 border border-transparent px-1.5 text-[11px] transition-colors hover:border-[var(--rule-strong)] hover:bg-[var(--ink-wash)]"
      style={{ color: liked ? "var(--cat-geopolitics)" : "var(--text-muted)" }}
    >
      <Heart
        className="h-4 w-4"
        fill={liked ? "currentColor" : "none"}
        aria-hidden
      />
      {/* The word only appears where nothing has been counted yet: once there
          is a number, "Like 12" reads as a quantity of likes rather than as a
          verb and a total. */}
      {total > 0 ? (
        <span className="tabular-nums">{total.toLocaleString("en-IN")}</span>
      ) : (
        <span className="hidden sm:inline">Like</span>
      )}
      <span className="sr-only">
        {liked ? "Liked" : "Like this story"}
        {total > 0 ? `, ${total} in total` : ""}
      </span>
    </button>
  );
}

/**
 * Share where the browser has a share sheet, copy where it doesn't.
 *
 * `navigator.share` only exists on phones and only over HTTPS, and it throws
 * when the reader dismisses the sheet - which is not an error, just a "no".
 * Everywhere else the useful thing is the link on the clipboard with the
 * headline attached, so it can be pasted into a message as-is.
 */
function ShareButton({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  // Feature detection in an effect, not in render: the server has no
  // `navigator`, and a button that changed shape during hydration would flicker.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    });
    return () => cancelAnimationFrame(frame);
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
        // Dismissed, or the sheet refused - fall through to the clipboard so
        // the button always does something.
      }
    }
    try {
      await navigator.clipboard.writeText(`${title} - ${url}`);
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
      className="kicker inline-flex h-8 min-w-8 items-center justify-center gap-1.5 border border-transparent px-1.5 text-[11px] transition-colors hover:border-[var(--rule-strong)] hover:bg-[var(--ink-wash)]"
      style={{ color: copied ? "var(--cat-economy)" : "var(--text-muted)" }}
    >
      <Icon className="h-4 w-4" aria-hidden />
      <span className="hidden sm:inline">{copied ? "Copied" : canShare ? "Share" : "Copy"}</span>
      <span className="sr-only sm:hidden">Copy headline and link</span>
    </button>
  );
}
