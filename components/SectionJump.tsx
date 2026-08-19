"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Newspaper, FileText, Star, Activity, TrendingUp, type LucideIcon } from "lucide-react";

/**
 * The page's own sections. Each entry is drawn only when a section with that
 * id is actually on screen, so one component serves the India desk (all four),
 * the world desk (no wrap) and a section page (lead + archive) without any
 * per-page wiring.
 */
const TARGETS: { id: string; label: string; icon: LucideIcon; colorVar: string }[] = [
  { id: "archive", label: "Latest", icon: Newspaper, colorVar: "--cat-economy" },
  { id: "wrap", label: "Wrap", icon: FileText, colorVar: "--cat-policy" },
  { id: "lead", label: "Lead", icon: Star, colorVar: "--cat-subsidy" },
  { id: "sectors", label: "Sectors", icon: TrendingUp, colorVar: "--cat-investment" },
  { id: "pulse", label: "Pulse", icon: Activity, colorVar: "--cat-tech" },
];

/** Roughly the sticky masthead's height — the line a section counts as "at the top". */
const HEADER_OFFSET = 150;

function sameOrder(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

/**
 * Boxed jump links in the masthead.
 *
 * The front page is several tall panels deep, and scrolling to find the wrap or
 * the pulse costs more than it should. Each destination gets its own bordered
 * box rather than sharing a rule, so the row reads as a set of doors out of the
 * current section instead of another line of nav text.
 */
export function SectionJump() {
  const pathname = usePathname();
  const [present, setPresent] = useState<string[]>([]);
  const [active, setActive] = useState("");

  useEffect(() => {
    // Which sections exist is a property of the rendered page, so it is read
    // from the DOM rather than mapped from the route — and read on the next
    // frame, because the page has to be laid out before it can be measured.
    let ids: string[] = [];

    const sync = () => {
      let current = "";
      for (const id of ids) {
        const top = document.getElementById(id)?.getBoundingClientRect().top ?? Infinity;
        // The last section whose top has passed under the masthead is the one
        // being read; anything still below it has not been reached.
        if (top <= HEADER_OFFSET) current = id;
      }
      setActive(current);
    };

    // Ordered by where the sections actually sit, so the row of boxes reads
    // top-to-bottom in the order a reader will meet them.
    const read = () => {
      ids = TARGETS.map((target) => document.getElementById(target.id))
        .filter((el): el is HTMLElement => el !== null)
        .sort((a, b) => a.offsetTop - b.offsetTop)
        .map((el) => el.id);
      setPresent((prev) => (sameOrder(prev, ids) ? prev : ids));
      sync();
    };

    // Read straight away — effects run after the commit, so the sections are
    // in the document and measurable by now. The deferred second pass is for
    // sections that arrive later out of a Suspense boundary; doing *only* the
    // deferred pass is what left this row empty, because a frame callback
    // scheduled in an effect is cancelled by that effect's own cleanup when
    // React re-runs it, and in development it always re-runs it.
    // Read now, then keep watching. The masthead is streamed and hydrated
    // before <main> exists, so at this moment the page's sections are usually
    // not in the document yet — which is why this row was silently empty on
    // every page. A single deferred pass is not enough either: sections behind
    // a Suspense boundary can arrive seconds later. The observer is debounced
    // to one read per frame and stops once every target has been found.
    read();

    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        read();
        if (ids.length === TARGETS.length) observer.disconnect();
      });
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    schedule();

    window.addEventListener("scroll", sync, { passive: true });
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", sync);
    };
  }, [pathname]);

  if (present.length < 2) return null;

  const items = present
    .map((id) => TARGETS.find((target) => target.id === id))
    .filter((target): target is (typeof TARGETS)[number] => target !== undefined);

  return (
    <div className="rail flex items-center gap-1.5 overflow-x-auto">
      <span className="kicker mr-0.5 hidden shrink-0 text-[9px] text-[var(--text-muted)] sm:block">
        Jump to
      </span>
      {items.map(({ id, label, icon: Icon, colorVar }) => {
        const isActive = active === id;
        return (
          <a
            key={id}
            href={`#${id}`}
            aria-current={isActive ? "true" : undefined}
            className="flex shrink-0 items-center gap-1.5 border px-2.5 py-1 text-[12px] transition-colors"
            style={{
              borderColor: isActive ? `var(${colorVar})` : "var(--rule-strong)",
              backgroundColor: isActive
                ? `color-mix(in srgb, var(${colorVar}) 14%, var(--surface-1))`
                : "transparent",
              color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
              fontWeight: isActive ? 600 : 400,
            }}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: `var(${colorVar})` }} aria-hidden />
            {label}
          </a>
        );
      })}
    </div>
  );
}
