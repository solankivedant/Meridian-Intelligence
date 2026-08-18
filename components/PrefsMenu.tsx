"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser, Keyboard, Monitor, Moon, SlidersHorizontal, Sun, VolumeX } from "lucide-react";
import {
  setDensity,
  setTheme,
  unmuteAll,
  useDensity,
  useMutedSources,
  useTheme,
  type Density,
  type Theme,
} from "@/lib/prefs";
import { clearReadLog } from "@/lib/reading";
import { useHydrated } from "@/lib/clientStore";
import { ShortcutsDialog } from "./KeyboardLayer";

const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

const DENSITIES: { value: Density; label: string; hint: string }[] = [
  { value: "comfortable", label: "Comfortable", hint: "Headline, deck, byline" },
  { value: "compact", label: "Compact", hint: "Headlines only" },
];

/**
 * Where the reader's own settings live.
 *
 * They are deliberately not in the masthead. A theme switch, a density switch
 * and a mute list are each used roughly once and then never again, and three
 * more controls in a header that already carries a drawer, a search field, a
 * dateline and two rows of navigation would cost more attention every day than
 * they save in a year. One button opens all of them.
 */
export function PrefsMenu() {
  const [open, setOpen] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [cleared, setCleared] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const theme = useTheme();
  const density = useDensity();
  const muted = useMutedSources();
  const hydrated = useHydrated();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!cleared) return;
    const timer = setTimeout(() => setCleared(false), 2000);
    return () => clearTimeout(timer);
  }, [cleared]);

  return (
    <div ref={rootRef} className="relative shrink-0" data-noprint>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Reading preferences"
        title="Reading preferences"
        className="flex h-9 w-9 items-center justify-center border transition-colors hover:bg-[var(--ink-wash)]"
        style={{ borderColor: "var(--rule-strong)", color: "var(--text-primary)" }}
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Reading preferences"
          className="absolute right-0 top-[calc(100%+6px)] z-50 w-[17rem] border shadow-2xl"
          style={{ borderColor: "var(--rule-strong)", backgroundColor: "var(--surface-1)" }}
        >
          <Group label="Theme">
            <div className="grid grid-cols-3 gap-1">
              {THEMES.map(({ value, label, icon: Icon }) => (
                <Choice
                  key={value}
                  // Before hydration the stored theme is unknown, so nothing is
                  // marked current rather than "System" being marked wrongly.
                  active={hydrated && theme === value}
                  onClick={() => setTheme(value)}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {label}
                </Choice>
              ))}
            </div>
          </Group>

          <Group label="Density">
            <div className="grid grid-cols-2 gap-1">
              {DENSITIES.map(({ value, label, hint }) => (
                <Choice
                  key={value}
                  active={hydrated && density === value}
                  onClick={() => setDensity(value)}
                  title={hint}
                >
                  {label}
                </Choice>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-[var(--text-muted)]">
              Compact drops the decks and tightens the grid — the scanning view.
            </p>
          </Group>

          <Group label="Reading">
            <Row
              icon={Keyboard}
              onClick={() => {
                setOpen(false);
                setShortcuts(true);
              }}
            >
              Keyboard shortcuts
            </Row>
            <Row
              icon={Eraser}
              onClick={() => {
                clearReadLog();
                setCleared(true);
              }}
            >
              {cleared ? "Reading history cleared" : "Clear reading history"}
            </Row>
            {muted.length > 0 && (
              <Row icon={VolumeX} onClick={unmuteAll}>
                Unmute {muted.length} {muted.length === 1 ? "publisher" : "publishers"}
              </Row>
            )}
          </Group>

          <p
            className="border-t px-4 py-2.5 text-[11px] leading-relaxed text-[var(--text-muted)]"
            style={{ borderColor: "var(--rule)" }}
          >
            Every setting here is stored in this browser only. Nothing is sent
            anywhere, and there is nothing to sign in to.
          </p>
        </div>
      )}

      <ShortcutsDialog open={shortcuts} onClose={() => setShortcuts(false)} />
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b px-4 py-3" style={{ borderColor: "var(--rule)" }}>
      <p className="kicker pb-1.5 text-[9px] text-[var(--text-muted)]">{label}</p>
      {children}
    </div>
  );
}

function Choice({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className="flex items-center justify-center gap-1 border px-1.5 py-1.5 text-[11.5px] transition-colors"
      style={{
        borderColor: active ? "var(--text-primary)" : "var(--rule-strong)",
        backgroundColor: active ? "var(--ink-wash)" : "transparent",
        color: active ? "var(--text-primary)" : "var(--text-secondary)",
        fontWeight: active ? 600 : 400,
      }}
    >
      {children}
    </button>
  );
}

function Row({
  icon: Icon,
  onClick,
  children,
}: {
  icon: typeof Keyboard;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 py-1.5 text-left text-[13px] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" aria-hidden />
      {children}
    </button>
  );
}
