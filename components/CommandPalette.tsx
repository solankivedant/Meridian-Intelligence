"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bookmark,
  Check,
  Clock,
  CornerDownLeft,
  Eraser,
  Globe2,
  Keyboard,
  MapPin,
  Monitor,
  Moon,
  Printer,
  Radio,
  Rows3,
  Search,
  Sparkles,
  Sun,
  VolumeX,
  type LucideIcon,
} from "lucide-react";
import { CATEGORY_META } from "@/lib/categoryMeta";
import { clearRecentSearches, setDensity, setTheme, unmuteAll, useDensity, useMutedSources, useRecentSearches } from "@/lib/prefs";
import { clearReadLog, markManyRead } from "@/lib/reading";
import { useSavedStories } from "@/lib/saved";

type Command = {
  id: string;
  label: string;
  hint?: string;
  group: string;
  icon: LucideIcon;
  /** Extra words the reader might type to find this. */
  keywords?: string;
  color?: string;
  run: () => void;
};

/**
 * One box that reaches everywhere.
 *
 * The drawer holds the destinations and the masthead holds search, but neither
 * answers "take me to trade, now" without a hand leaving the keyboard. A
 * palette is the only control that scales with the site: every desk, all eight
 * sections, the display settings and the reader's own recent searches sit
 * behind the same three keystrokes, and anything it does not recognise falls
 * through to a search of the archive.
 */
export function CommandPalette({
  open,
  onClose,
  onShowShortcuts,
}: {
  open: boolean;
  onClose: () => void;
  onShowShortcuts: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const density = useDensity();
  const muted = useMutedSources();
  const saved = useSavedStories();
  const recent = useRecentSearches();

  // A palette that reopens holding the last search is a palette you have to
  // clear before you can use it.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      // The input mounts with the portal, so focusing it has to wait a frame.
      const frame = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => {
      router.push(href);
      onClose();
    };

    const items: Command[] = [
      { id: "go-india", label: "India desk", group: "Go to", icon: MapPin, keywords: "home front page", run: go("/") },
      { id: "go-world", label: "World desk", group: "Go to", icon: Globe2, keywords: "global international", run: go("/world") },
      {
        id: "go-desk",
        label: "Your desk",
        hint: "Rank the archive on a topic",
        group: "Go to",
        icon: Sparkles,
        color: "var(--cat-tech)",
        keywords: "topic personalised gemini",
        run: go("/my-desk"),
      },
      {
        id: "go-saved",
        label: "Saved stories",
        hint: saved.length > 0 ? `${saved.length} on the shelf` : "Nothing saved yet",
        group: "Go to",
        icon: Bookmark,
        color: "var(--cat-subsidy)",
        keywords: "reading list bookmarks shelf",
        run: go("/saved"),
      },
      { id: "go-sources", label: "Sources", group: "Go to", icon: Radio, keywords: "publishers feeds provenance", run: go("/sources") },
    ];

    for (const meta of CATEGORY_META) {
      items.push({
        id: `section-${meta.slug}`,
        label: meta.label,
        hint: meta.shortLabel,
        group: "Sections",
        icon: meta.icon,
        color: `var(${meta.colorVar})`,
        keywords: meta.description,
        run: go(`/category/${meta.slug}`),
      });
    }

    for (const search of recent) {
      items.push({
        id: `recent-${search}`,
        label: search,
        hint: "Recent search",
        group: "Recent searches",
        icon: Clock,
        run: go(`/search?q=${encodeURIComponent(search)}`),
      });
    }

    items.push(
      {
        id: "theme-light",
        label: "Light theme",
        group: "Display",
        icon: Sun,
        keywords: "appearance colour bright day",
        run: () => {
          setTheme("light");
          onClose();
        },
      },
      {
        id: "theme-dark",
        label: "Dark theme",
        group: "Display",
        icon: Moon,
        keywords: "appearance colour night",
        run: () => {
          setTheme("dark");
          onClose();
        },
      },
      {
        id: "theme-system",
        label: "Match system theme",
        group: "Display",
        icon: Monitor,
        keywords: "appearance auto os",
        run: () => {
          setTheme("system");
          onClose();
        },
      },
      {
        id: "density",
        label: density === "compact" ? "Comfortable density" : "Compact density",
        hint: density === "compact" ? "Bring the decks back" : "Headlines only, tighter rows",
        group: "Display",
        icon: Rows3,
        keywords: "spacing compact scan tighter",
        run: () => {
          setDensity(density === "compact" ? "comfortable" : "compact");
          onClose();
        },
      },
      {
        id: "print",
        label: "Print this page",
        hint: "Chrome and controls are stripped",
        group: "Display",
        icon: Printer,
        keywords: "pdf paper export",
        run: () => {
          onClose();
          // The dialog has to be off screen before the print snapshot is taken.
          setTimeout(() => window.print(), 120);
        },
      },
      {
        id: "mark-read",
        label: "Mark everything on this page as read",
        group: "Reading",
        icon: Check,
        keywords: "catch up clear new",
        run: () => {
          markManyRead(
            Array.from(document.querySelectorAll<HTMLElement>("a[data-story-id]")).map(
              (el) => el.dataset.storyId as string
            )
          );
          onClose();
        },
      },
      {
        id: "clear-read",
        label: "Clear reading history",
        hint: "Un-dims every story you have opened",
        group: "Reading",
        icon: Eraser,
        keywords: "reset forget",
        run: () => {
          clearReadLog();
          onClose();
        },
      },
      {
        id: "shortcuts",
        label: "Keyboard shortcuts",
        group: "Reading",
        icon: Keyboard,
        keywords: "keys help hotkeys",
        run: () => {
          onClose();
          onShowShortcuts();
        },
      }
    );

    if (muted.length > 0) {
      items.push({
        id: "unmute",
        label: `Unmute ${muted.length} ${muted.length === 1 ? "publisher" : "publishers"}`,
        group: "Reading",
        icon: VolumeX,
        keywords: "sources dim hide",
        run: () => {
          unmuteAll();
          onClose();
        },
      });
    }

    if (recent.length > 0) {
      items.push({
        id: "clear-recent",
        label: "Clear recent searches",
        group: "Reading",
        icon: Eraser,
        run: () => {
          clearRecentSearches();
          onClose();
        },
      });
    }

    return items;
  }, [router, onClose, onShowShortcuts, density, muted.length, saved.length, recent]);

  const needle = query.trim().toLowerCase();
  const matches = needle
    ? commands.filter((command) =>
        `${command.label} ${command.hint ?? ""} ${command.group} ${command.keywords ?? ""}`
          .toLowerCase()
          .includes(needle)
      )
    : commands;

  const searchFallback = query.trim().length >= 2;
  // The archive search is always the last row, so a query that matches nothing
  // still has somewhere to go — and Enter on an empty selection means "search".
  const rows = matches.length + (searchFallback ? 1 : 0);
  const index = Math.min(active, Math.max(rows - 1, 0));

  function runRow(row: number) {
    if (searchFallback && row === matches.length) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      onClose();
      return;
    }
    matches[row]?.run();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown" || (event.key === "n" && event.ctrlKey)) {
      event.preventDefault();
      setActive((prev) => (rows === 0 ? 0 : (Math.min(prev, rows - 1) + 1) % rows));
    } else if (event.key === "ArrowUp" || (event.key === "p" && event.ctrlKey)) {
      event.preventDefault();
      setActive((prev) => (rows === 0 ? 0 : (Math.min(prev, rows - 1) + rows - 1) % rows));
    } else if (event.key === "Enter") {
      event.preventDefault();
      runRow(index);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  }

  // Keeping the highlighted row on screen is what makes arrow-key browsing of a
  // list longer than the box actually usable.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [index, query]);

  if (!open || typeof document === "undefined") return null;

  let lastGroup = "";

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <button
        type="button"
        aria-label="Close the command palette"
        onClick={onClose}
        className="absolute inset-0 cursor-default backdrop-blur-[2px]"
        style={{ backgroundColor: "color-mix(in srgb, var(--paper) 55%, transparent)" }}
      />

      <div
        className="relative flex w-full max-w-xl flex-col border shadow-2xl"
        style={{ borderColor: "var(--rule-strong)", backgroundColor: "var(--surface-1)" }}
        onKeyDown={onKeyDown}
      >
        <div
          className="flex items-center gap-2.5 border-b px-4 py-3"
          style={{ borderColor: "var(--rule)" }}
        >
          <Search className="h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            placeholder="Jump to a desk, a section, a setting — or search the archive"
            aria-label="Command or search"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
          />
          <kbd
            className="meta hidden shrink-0 border px-1.5 py-0.5 text-[10px] sm:block"
            style={{ borderColor: "var(--rule-strong)" }}
          >
            Esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto">
          {matches.map((command, row) => {
            const header = command.group !== lastGroup ? command.group : null;
            lastGroup = command.group;
            const Icon = command.icon;
            const isActive = row === index;

            return (
              <div key={command.id}>
                {header && (
                  <p
                    className="kicker border-b px-4 pb-1 pt-3 text-[9px] text-[var(--text-muted)]"
                    style={{ borderColor: "var(--rule)" }}
                  >
                    {header}
                  </p>
                )}
                <button
                  type="button"
                  data-active={isActive ? "true" : undefined}
                  onMouseEnter={() => setActive(row)}
                  onClick={() => runRow(row)}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-left"
                  style={{ backgroundColor: isActive ? "var(--ink-wash)" : "transparent" }}
                >
                  <Icon
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: command.color ?? "var(--text-muted)" }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--text-primary)]">
                    {command.label}
                  </span>
                  {command.hint && (
                    <span className="meta hidden shrink-0 truncate text-[10px] sm:block">
                      {command.hint}
                    </span>
                  )}
                  {isActive && (
                    <CornerDownLeft className="h-3 w-3 shrink-0 text-[var(--text-muted)]" aria-hidden />
                  )}
                </button>
              </div>
            );
          })}

          {searchFallback && (
            <button
              type="button"
              data-active={index === matches.length ? "true" : undefined}
              onMouseEnter={() => setActive(matches.length)}
              onClick={() => runRow(matches.length)}
              className="flex w-full items-center gap-2.5 border-t px-4 py-2.5 text-left"
              style={{
                borderColor: "var(--rule-strong)",
                backgroundColor: index === matches.length ? "var(--ink-wash)" : "var(--surface-2)",
              }}
            >
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--text-secondary)]">
                Search every headline for{" "}
                <span className="font-semibold text-[var(--text-primary)]">
                  &ldquo;{query.trim()}&rdquo;
                </span>
              </span>
            </button>
          )}

          {matches.length === 0 && !searchFallback && (
            <p className="px-4 py-6 text-[14px] text-[var(--text-muted)]">
              Nothing matches that. Type two or more characters to search the archive
              instead.
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
