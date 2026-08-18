"use client";

import { useEffect, useState } from "react";

/**
 * How far down the page the reader is, drawn on the masthead's bottom edge.
 *
 * The front page is several tall panels deep and the archive runs to forty
 * stories, so "am I near the end of this" is a real question and the scrollbar
 * is a poor answer on a laptop trackpad, where it hides until you scroll. It
 * sits on the header's own edge rather than floating: a bar that overlays the
 * page is chrome, a bar that finishes a rule already there is a detail.
 */
export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const sync = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      // A page shorter than the viewport has no progress to report.
      setProgress(scrollable <= 40 ? 0 : Math.min(window.scrollY / scrollable, 1));
    };

    sync();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-[-1px] h-[2px]"
      aria-hidden
      data-noprint
    >
      <div
        className="h-full origin-left transition-transform duration-150 ease-out"
        style={{
          transform: `scaleX(${progress})`,
          backgroundColor: "var(--text-primary)",
          opacity: progress > 0.005 ? 0.5 : 0,
        }}
      />
    </div>
  );
}
