import { STORAGE_KEYS } from "@/lib/storageKeys";

/**
 * Theme and density, applied before the first paint.
 *
 * React can't do this: by the time a component runs, the browser has already
 * painted a white page, and a reader who chose dark gets a white flash on
 * every navigation to a fresh document. The only fix is a synchronous script
 * in the markup that reads the same two keys `lib/prefs.ts` writes and sets
 * the attributes the stylesheet keys off. It is deliberately tiny, and it
 * fails silently — a browser that refuses storage still gets the light theme
 * rather than an exception before anything has rendered.
 */
export function PreferencesScript() {
  const script = `
(function () {
  try {
    var read = function (key, fallback) {
      try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
      catch (e) { return fallback; }
    };
    var root = document.documentElement;
    var theme = read(${JSON.stringify(STORAGE_KEYS.theme)}, 'system');
    var dark = theme === 'dark' || (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    root.setAttribute('data-density', read(${JSON.stringify(STORAGE_KEYS.density)}, 'comfortable'));
  } catch (e) {}
})();`.trim();

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
