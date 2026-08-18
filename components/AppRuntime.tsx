"use client";

import { useEffect } from "react";
import { applyTheme, useTheme } from "@/lib/prefs";
import { recordVisit } from "@/lib/reading";

/**
 * The page's standing client-side housekeeping. Renders nothing.
 *
 *  - Stamps the visit, which is what "new since your last visit" is measured
 *    against. Done in an effect, not during render, so nothing writes to
 *    storage while React is deciding what to draw.
 *  - Keeps "system" theme honest. The pre-paint script resolves the OS
 *    preference once; if the reader flips their OS to dark while the tab is
 *    open, only a live listener catches it.
 */
export function AppRuntime() {
  const theme = useTheme();

  useEffect(() => {
    recordVisit();
  }, []);

  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => applyTheme("system");
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [theme]);

  return null;
}
