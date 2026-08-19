"use client";

import { useState, useSyncExternalStore } from "react";
import { Keyboard, Moon, Sun } from "lucide-react";
import { setTheme } from "@/lib/prefs";
import { useHydrated } from "@/lib/clientStore";
import { ShortcutsDialog } from "./KeyboardLayer";

/**
 * The resolved appearance, read off the `data-theme` attribute rather than off
 * the stored preference - the stored value may be "system", and a sun/moon
 * switch has to show what is actually on screen. Subscribed rather than read
 * once, so the `t` shortcut, the pre-paint script and an OS-level change all
 * keep the icon in step.
 */
function subscribeToTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

const isDarkNow = () => document.documentElement.getAttribute("data-theme") === "dark";

// The server cannot know the theme, so it renders as light and the first client
// pass corrects it - the same repaint-not-mismatch contract as lib/clientStore.
const isDarkOnServer = () => false;

/**
 * The masthead's two controls, and only two.
 *
 * This replaced a settings menu holding theme, density, a reading-history
 * reset and a mute list. Everything in it was used roughly once, but the button
 * that opened it sat in the masthead of every page forever - and a menu is the
 * shape you reach for when you have not decided what actually belongs in a
 * header. The two things a reader touches more than once are the light switch
 * and the shortcut list, so those are here as themselves rather than behind a
 * lid, and everything else lives on the keys (`t`, `c`) the shortcut list
 * documents.
 */
export function HeaderControls() {
  return (
    <span className="flex shrink-0 items-center gap-1.5" data-noprint>
      <ThemeToggle />
      <ShortcutsButton />
    </span>
  );
}

function ThemeToggle() {
  const dark = useSyncExternalStore(subscribeToTheme, isDarkNow, isDarkOnServer);
  const hydrated = useHydrated();

  return (
    <ControlButton
      label={dark ? "Switch to the light theme" : "Switch to the dark theme"}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {/* The glyph is held back until the first client pass. The button keeps
          its size either way, so nothing moves - it simply avoids a moon
          flipping to a sun a frame after the page paints. */}
      {dark ? (
        <Sun className={`h-4 w-4 ${hydrated ? "" : "opacity-0"}`} aria-hidden />
      ) : (
        <Moon className={`h-4 w-4 ${hydrated ? "" : "opacity-0"}`} aria-hidden />
      )}
    </ControlButton>
  );
}

function ShortcutsButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ControlButton label="Keyboard shortcuts" onClick={() => setOpen(true)}>
        <Keyboard className="h-4 w-4" aria-hidden />
      </ControlButton>
      <ShortcutsDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function ControlButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center border transition-colors hover:bg-[var(--ink-wash)]"
      style={{ borderColor: "var(--rule-strong)", color: "var(--text-primary)" }}
    >
      {children}
    </button>
  );
}
