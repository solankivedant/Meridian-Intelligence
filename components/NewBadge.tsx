"use client";

import { useIsNew, useIsRead } from "@/lib/reading";

/**
 * The mark that says "this landed while you were away".
 *
 * Suppressed once the story has been opened: a flag that survives being acted
 * on stops meaning anything by the third visit. Renders nothing until
 * hydration settles, so it can never disagree with the server's markup.
 */
export function NewBadge({ id, publishedAt }: { id: string; publishedAt: string }) {
  const isNew = useIsNew(publishedAt);
  const read = useIsRead(id);

  if (!isNew || read) return null;

  return (
    <span
      className="kicker inline-flex h-[18px] shrink-0 items-center px-1.5 text-[9px] leading-none"
      style={{
        color: "var(--cat-geopolitics)",
        backgroundColor: "color-mix(in srgb, var(--cat-geopolitics) 13%, transparent)",
      }}
      title="Published since your last visit"
    >
      New
    </span>
  );
}
