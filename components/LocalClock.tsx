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
 */
export function LocalClock() {
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
