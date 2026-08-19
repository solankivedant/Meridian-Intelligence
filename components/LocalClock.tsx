"use client";

import { useEffect, useState } from "react";
import { localClock, localZone } from "@/lib/formatTime";

/**
 * The reader's own wall clock, sat beside the masthead dateline.
 *
 * It has to be a client component and it has to start empty: the server has no
 * idea what timezone the browser is in, so rendering any time on the server
 * would either be wrong or trip a hydration mismatch. The slot holds its width
 * from the start so the dateline does not jump when the first tick lands.
 *
 * Ticks on the minute boundary rather than every 60s from mount, so the digits
 * change when the reader's system clock changes rather than a few seconds off.
 *
 * Two registers. `masthead` is the full-size clock that sits beside the long
 * dateline on a wide screen; `compact` is the same clock at metadata size for
 * the nav row, which is where the date and time live below that breakpoint -
 * they were previously hidden outright on a phone, so the one piece of chrome
 * that says "this is today's edition" was missing from exactly the device most
 * readers arrive on.
 */
export function LocalClock({ variant = "masthead" }: { variant?: "masthead" | "compact" }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const date = new Date();
      setNow(date);
      // Sleep only until the top of the next minute.
      timer = setTimeout(tick, 60_000 - (date.getSeconds() * 1000 + date.getMilliseconds()));
    };

    tick();
    return () => clearTimeout(timer);
  }, []);

  if (variant === "compact") {
    // No zone label here. It renders as `GMT+5:30` for most Indian browsers -
    // eight characters that say nothing a reader of an India desk did not
    // already assume, sitting in the one row a phone has for the desk nav. The
    // nav scrolls, so every character spent here is a destination pushed off
    // the end of it. The full clock upstairs still carries the zone.
    return (
      <time
        className="text-[11px] leading-none font-medium tabular-nums text-[var(--text-secondary)]"
        dateTime={now?.toISOString()}
        title={now ? localZone(now) : undefined}
        suppressHydrationWarning
      >
        {now ? localClock(now) : "--:--"}
      </time>
    );
  }

  return (
    <span
      className="hidden items-baseline gap-1.5 text-[var(--text-muted)] lg:inline-flex"
      suppressHydrationWarning
    >
      <span aria-hidden style={{ color: "var(--rule-strong)" }}>
        ·
      </span>
      <time
        className="text-[17px] leading-tight font-medium tabular-nums xl:text-[20px]"
        style={{ fontFamily: "var(--font-newsreader), Georgia, serif" }}
        dateTime={now?.toISOString()}
      >
        {now ? localClock(now) : "--:--"}
      </time>
      <span className="kicker text-[9px] sm:text-[10px]">{now ? localZone(now) : ""}</span>
    </span>
  );
}
