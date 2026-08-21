"use client";

import { useEffect, useState } from "react";
import { CloudOff } from "lucide-react";

/**
 * Says so when the network has gone.
 *
 * Without it, an offline reader gets a page that simply stops responding:
 * search returns nothing, the ask box fails, a like never lands, links go
 * nowhere, and none of it looks like a connection problem. What is already
 * rendered stays readable, so the banner says that rather than only reporting
 * bad news.
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
        New stories, search, likes and the AI panels all need a connection.
        Whatever is already on this page stays readable.
      </p>
    </div>
  );
}
