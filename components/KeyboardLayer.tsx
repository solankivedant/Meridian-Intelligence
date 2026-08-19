"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Category } from "@/lib/enums";
import { setDensity, setTheme, useDensity, useTheme, type Theme } from "@/lib/prefs";
import { markRead } from "@/lib/reading";
import { toggleSaved } from "@/lib/saved";
import { CommandPalette } from "./CommandPalette";

/**
 * The keyboard, as a first-class way through the page.
 *
 * A feed is a list, and a list wants to be walked without a pointer. Every
 * headline is already an anchor carrying its story in `data-story-*`, so this
 * layer needs no registry and no context: it queries the document for the
 * stories currently rendered, moves real DOM focus between them — which keeps
 * the browser's own focus ring, Enter-to-open and screen-reader announcements
 * working — and reads the dataset of whichever one is focused when a key asks
 * it to save or open.
 *
 * It never fires while the reader is typing: the search field, the ask box and
 * the palette all take precedence.
 */
export function KeyboardLayer() {
  const router = useRouter();
  const theme = useTheme();
  const density = useDensity();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const stories = useCallback(
    () => Array.from(document.querySelectorAll<HTMLAnchorElement>("a[data-story-id]")),
    []
  );

  /**
   * Moves focus by `step`. With nothing focused it starts from the first story
   * still on screen rather than the top of the document, so pressing `j`
   * halfway down a long feed continues from where the reader is looking.
   */
  const move = useCallback(
    (step: number) => {
      const list = stories();
      if (list.length === 0) return;

      const current = list.indexOf(document.activeElement as HTMLAnchorElement);
      let next: number;
      if (current >= 0) {
        next = Math.min(Math.max(current + step, 0), list.length - 1);
      } else {
        const firstVisible = list.findIndex((el) => el.getBoundingClientRect().top > 120);
        next = firstVisible === -1 ? (step > 0 ? 0 : list.length - 1) : firstVisible;
      }

      const target = list[next];
      // Focus first without scrolling, then place the story in the middle of
      // the viewport — the browser's own focus scroll would jam it under the
      // sticky masthead.
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: "center", behavior: "smooth" });
    },
    [stories]
  );

  const focused = useCallback((): HTMLAnchorElement | null => {
    const el = document.activeElement;
    return el instanceof HTMLAnchorElement && el.dataset.storyId ? el : null;
  }, []);

  useEffect(() => {
    // `g` is a prefix, not a command: g-h, g-w and friends only mean something
    // as a pair, and the pending state lapses so a stray g does not lie in wait.
    let pendingGo = false;
    let pendingTimer: ReturnType<typeof setTimeout> | undefined;

    const armGo = () => {
      pendingGo = true;
      clearTimeout(pendingTimer);
      pendingTimer = setTimeout(() => {
        pendingGo = false;
      }, 1200);
    };

    function isTyping(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      return (
        target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
      );
    }

    function onKeyDown(event: KeyboardEvent) {
      // The palette is the one shortcut that has to work from inside a field.
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }

      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target)) return;

      if (event.key === "Escape") {
        setPaletteOpen(false);
        setHelpOpen(false);
        // Focus left on a headline keeps the ring on screen after the reader
        // has moved on.
        if (focused()) (document.activeElement as HTMLElement).blur();
        return;
      }

      if (paletteOpen || helpOpen) return;

      const key = event.key;

      if (pendingGo) {
        const destination: Record<string, string> = {
          h: "/",
          i: "/",
          w: "/world",
          d: "/my-desk",
          b: "/saved",
          o: "/opportunities",
          s: "/sources",
        };
        const href = destination[key.toLowerCase()];
        pendingGo = false;
        if (href) {
          event.preventDefault();
          router.push(href);
        }
        return;
      }

      switch (key) {
        case "j":
          event.preventDefault();
          move(1);
          break;
        case "k":
          event.preventDefault();
          move(-1);
          break;
        case "o":
        case "Enter": {
          const story = focused();
          if (!story) return;
          // Enter on a focused anchor already opens it; intercepting would
          // double-open. `o` is the one that needs doing by hand.
          if (key === "Enter") {
            markRead(story.dataset.storyId as string);
            return;
          }
          event.preventDefault();
          markRead(story.dataset.storyId as string);
          window.open(story.href, "_blank", "noopener,noreferrer");
          break;
        }
        case "s": {
          const story = focused();
          if (!story) return;
          event.preventDefault();
          const data = story.dataset;
          toggleSaved({
            id: data.storyId as string,
            title: data.storyTitle as string,
            url: story.href,
            sourceName: data.storySource ?? "",
            category: data.storyCategory as Category,
            publishedAt: data.storyPublished ?? new Date().toISOString(),
          });
          break;
        }
        case "g":
          armGo();
          break;
        case "t": {
          event.preventDefault();
          const order: Theme[] = ["system", "light", "dark"];
          setTheme(order[(order.indexOf(theme) + 1) % order.length]);
          break;
        }
        case "c":
          event.preventDefault();
          setDensity(density === "compact" ? "comfortable" : "compact");
          break;
        case "/": {
          event.preventDefault();
          const field = document.querySelector<HTMLInputElement>(
            'input[type="search"]:not([hidden])'
          );
          if (field) {
            field.focus();
            field.select();
          } else setPaletteOpen(true);
          break;
        }
        case "?":
          event.preventDefault();
          setHelpOpen(true);
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(pendingTimer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [router, move, focused, paletteOpen, helpOpen, theme, density]);

  return (
    <>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onShowShortcuts={() => setHelpOpen(true)}
      />
      <ShortcutsDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}

const SHORTCUTS: { keys: string[]; label: string; group: string }[] = [
  { keys: ["j"], label: "Next story", group: "Reading" },
  { keys: ["k"], label: "Previous story", group: "Reading" },
  { keys: ["o"], label: "Open the focused story", group: "Reading" },
  { keys: ["s"], label: "Save or unsave the focused story", group: "Reading" },
  { keys: ["Esc"], label: "Drop focus, close anything open", group: "Reading" },
  { keys: ["⌘", "K"], label: "Command palette", group: "Finding" },
  { keys: ["/"], label: "Jump to search", group: "Finding" },
  { keys: ["g", "h"], label: "India desk", group: "Finding" },
  { keys: ["g", "w"], label: "World desk", group: "Finding" },
  { keys: ["g", "d"], label: "Your desk", group: "Finding" },
  { keys: ["g", "b"], label: "Saved stories", group: "Finding" },
  { keys: ["g", "o"], label: "Sector opportunities", group: "Finding" },
  { keys: ["g", "s"], label: "Sources", group: "Finding" },
  { keys: ["t"], label: "Cycle theme — system, light, dark", group: "Display" },
  { keys: ["c"], label: "Toggle compact density", group: "Display" },
  { keys: ["?"], label: "This list", group: "Display" },
];

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  let lastGroup = "";

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default backdrop-blur-[2px]"
        style={{ backgroundColor: "color-mix(in srgb, var(--paper) 55%, transparent)" }}
      />

      <div
        className="relative max-h-[80vh] w-full max-w-md overflow-y-auto border shadow-2xl"
        style={{ borderColor: "var(--rule-strong)", backgroundColor: "var(--surface-1)" }}
      >
        <div
          className="sticky top-0 flex items-center justify-between border-b px-5 py-3"
          style={{ borderColor: "var(--rule)", backgroundColor: "var(--surface-1)" }}
        >
          <span className="kicker text-[var(--text-muted)]">Keyboard shortcuts</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <dl className="px-5 py-2">
          {SHORTCUTS.map((shortcut) => {
            const header = shortcut.group !== lastGroup ? shortcut.group : null;
            lastGroup = shortcut.group;
            return (
              <div key={shortcut.label}>
                {header && (
                  <p className="kicker pb-1 pt-4 text-[9px] text-[var(--text-muted)]">{header}</p>
                )}
                <div
                  className="flex items-center gap-3 border-b py-2 last:border-b-0"
                  style={{ borderColor: "var(--rule)" }}
                >
                  <dt className="flex shrink-0 gap-1">
                    {shortcut.keys.map((key) => (
                      <kbd
                        key={key}
                        className="meta inline-flex h-[22px] min-w-[22px] items-center justify-center border px-1.5 text-[11px] text-[var(--text-primary)]"
                        style={{ borderColor: "var(--rule-strong)" }}
                      >
                        {key}
                      </kbd>
                    ))}
                  </dt>
                  <dd className="min-w-0 flex-1 text-[13.5px] text-[var(--text-secondary)]">
                    {shortcut.label}
                  </dd>
                </div>
              </div>
            );
          })}
        </dl>

        <p
          className="border-t px-5 py-3 text-[12px] leading-relaxed text-[var(--text-muted)]"
          style={{ borderColor: "var(--rule)" }}
        >
          Nothing fires while you are typing in a field. Everything the keyboard
          reaches is also reachable by pointer — the shortcuts are a faster route,
          never the only one.
        </p>
      </div>
    </div>,
    document.body
  );
}
