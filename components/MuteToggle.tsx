"use client";

import { Volume2, VolumeX } from "lucide-react";
import { toggleMutedSource, useMutedSources } from "@/lib/prefs";

/**
 * Turn a publisher down.
 *
 * Wire-service syndication means one story can arrive from a dozen outlets,
 * and the reader who does not rate one of them has no way to say so. Muting
 * dims that publisher's tiles wherever they appear rather than deleting them -
 * the feed's counts and numbering are computed on the server, and a client
 * that removed rows would leave the page claiming forty stories while showing
 * thirty-one.
 */
export function MuteToggle({ sourceName }: { sourceName: string }) {
  const muted = useMutedSources().includes(sourceName);
  const Icon = muted ? VolumeX : Volume2;

  return (
    <button
      type="button"
      onClick={() => toggleMutedSource(sourceName)}
      aria-pressed={muted}
      title={
        muted
          ? `${sourceName} is muted - its stories are dimmed in the feed`
          : `Mute ${sourceName} - dim its stories in the feed`
      }
      className="reveal-on-hover shrink-0"
      // An already-muted publisher keeps its control on screen whatever the
      // pointer is doing - see `.reveal-on-hover[data-active]`.
      data-active={muted ? "true" : undefined}
      style={{ color: muted ? "var(--cat-geopolitics)" : "var(--text-muted)" }}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span className="sr-only">{muted ? `Unmute ${sourceName}` : `Mute ${sourceName}`}</span>
    </button>
  );
}
