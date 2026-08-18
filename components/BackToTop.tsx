"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/** Roughly two screens — far enough that scrolling back is a real chore. */
const REVEAL_AT = 1400;

/**
 * The way out of a long archive.
 *
 * Hidden until it is needed, because a button that is always on screen is one
 * more thing between the reader and the page. It returns to the top rather
 * than to the masthead's jump links: those are for moving between sections,
 * this is for the reader who has scrolled through four days of stories and
 * wants the top of the edition back.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = () => setVisible(window.scrollY > REVEAL_AT);
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, []);

  return (
    <button
      type="button"
      data-noprint
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to the top of the page"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className="fixed bottom-5 right-5 z-40 flex h-10 w-10 items-center justify-center border shadow-lg transition-all duration-200"
      style={{
        borderColor: "var(--rule-strong)",
        backgroundColor: "var(--surface-1)",
        color: "var(--text-primary)",
        opacity: visible ? 1 : 0,
        // Kept out of the hit-testing tree while invisible, or it would sit
        // over the footer's links and swallow clicks meant for them.
        pointerEvents: visible ? "auto" : "none",
        transform: visible ? "translateY(0)" : "translateY(8px)",
      }}
    >
      <ArrowUp className="h-4 w-4" aria-hidden />
    </button>
  );
}
