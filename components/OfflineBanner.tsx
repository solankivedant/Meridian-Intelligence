"use client";

import { useEffect, useState } from "react";
import { CloudOff } from "lucide-react";

/**
 * Says so when the network has gone.
 *
 * Without it, an offline reader gets a page that simply stops responding:
 * search returns nothing, the ask box fails, links go nowhere, and none of it
 * looks like a connection problem. The one part that still works is the saved
 * shelf, which is stored locally — so the banner points at it rather than just
 * reporting bad news.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    // Read in an effect: `navigator.onLine` does not exist while rendering on
    // the server, and starting from `false` keeps hydration honest.
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      data-noprint
      role="status"
      aria-live="polite"
      className="fixed bottom-5 left-5 z-40 flex max-w-[min(22rem,calc(100vw-2.5rem))] items-start gap-2.5 border p-3 shadow-lg"
      style={{
        borderColor: "var(--cat-geopolitics)",
        backgroundColor: "var(--surface-1)",
      }}
    >
      <CloudOff
        className="mt-0.5 h-4 w-4 shrink-0"
        style={{ color: "var(--cat-geopolitics)" }}
        aria-hidden
      />
      <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
        <strong className="font-semibold text-[var(--text-primary)]">You are offline.</strong>{" "}
        New stories, search and the AI panels need a connection — your{" "}
        <a href="/saved" className="underline underline-offset-2 hover:text-[var(--text-primary)]">
          saved stories
        </a>{" "}
        are stored in this browser and still work.
      </p>
    </div>
  );
}
