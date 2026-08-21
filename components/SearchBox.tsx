"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft } from "lucide-react";
import { MAX_QUERY_LENGTH } from "@/lib/searchLimits";
import { rememberSearch } from "@/lib/prefs";
import { Highlight, highlightTerms } from "./Highlight";

type Suggestion = {
  id: string;
  title: string;
  url: string;
  sourceName: string;
  colorVar: string;
  categoryLabel: string;
};

const DEBOUNCE_MS = 180;

/**
 * The masthead search field.
 *
 * It sits in the middle of the header at full width because search is how most
 * readers re-find a story they half-remember, and it suggests headlines as you
 * type so a partial memory ("semicon…") resolves without a round trip to the
 * results page. Enter always still runs the full search - the dropdown is a
 * shortcut, never the only way through.
 */
export function SearchBox({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();
  const listId = useId();
  const [value, setValue] = useState(defaultValue);
  // Results are stored with the query they answer, so what is on screen can be
  // derived from the current input rather than cleared by an effect.
  const [results, setResults] = useState<{ query: string; items: Suggestion[]; total: number }>({
    query: "",
    items: [],
    total: 0,
  });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);

  const query = value.trim();

  // A list fetched for "semicon" still describes "semicond" well enough to keep
  // on screen for the extra keystroke; anything else (a deletion, a new word)
  // is a different search and the old rows go.
  const usable =
    query.length >= 2 && results.query.length >= 2 && query.startsWith(results.query);
  const suggestions = usable ? results.items : [];
  const total = usable ? results.total : 0;

  useEffect(() => {
    if (query.length < 2 || query === results.query) return;

    // Both the timer and the in-flight request are torn down on every
    // keystroke, so a slow response for "sem" cannot land after "semicon" and
    // repaint the list with stale rows.
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { suggestions?: Suggestion[]; total?: number };
        setResults({ query, items: data.suggestions ?? [], total: data.total ?? 0 });
        setActive(-1);
      } catch {
        /* aborted or offline - the field stays a plain search box */
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, results.query]);

  // A dropdown that outlives a click elsewhere on the page reads as a stuck
  // overlay, so it closes on any pointer press outside its own box.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const runSearch = () => {
    if (!query) return;
    setOpen(false);
    // Kept so the command palette can offer it back - re-running a search you
    // ran yesterday is the most common search there is.
    rememberSearch(query);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  const showList = open && query.length >= 2 && suggestions.length > 0;
  // Marked against the words actually sent to the API, not the raw field: a
  // trailing half-typed character would otherwise mark nothing at all.
  const terms = highlightTerms(usable ? results.query : query);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!showList) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      // -1 is "nothing highlighted", where Enter means "search everything".
      setActive((prev) => {
        const next = prev + step;
        if (next < -1) return suggestions.length - 1;
        if (next >= suggestions.length) return -1;
        return next;
      });
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      window.open(suggestions[active].url, "_blank", "noopener,noreferrer");
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <form
        action="/search"
        method="GET"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          runSearch();
        }}
        className="flex w-full items-center gap-2 border px-3 py-2 transition-colors focus-within:border-[var(--text-primary)]"
        style={{
          borderColor: "var(--rule-strong)",
          backgroundColor: "var(--surface-1)",
        }}
      >
        <Search className="h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden />
        <input
          type="search"
          name="q"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          maxLength={MAX_QUERY_LENGTH}
          placeholder="Search every headline - e.g. semiconductor incentive"
          aria-label="Search the archive"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
        />
        <button
          type="submit"
          className="kicker shrink-0 border-l pl-2.5 text-[10px] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          style={{ borderColor: "var(--rule)" }}
        >
          Search
        </button>
      </form>

      {showList && (
        <div
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+4px)] z-40 border shadow-lg"
          style={{
            borderColor: "var(--rule-strong)",
            backgroundColor: "var(--surface-1)",
          }}
        >
          {suggestions.map((suggestion, i) => (
            <a
              key={suggestion.id}
              href={suggestion.url}
              target="_blank"
              rel="noopener noreferrer"
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => setOpen(false)}
              className="flex items-start gap-2.5 border-b px-3 py-2.5 last:border-b-0"
              style={{
                borderColor: "var(--rule)",
                backgroundColor: i === active ? "var(--ink-wash)" : "transparent",
              }}
            >
              <span
                className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: `var(${suggestion.colorVar})` }}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="headline-tight block truncate text-[14px] text-[var(--text-primary)]">
                  <Highlight text={suggestion.title} terms={terms} />
                </span>
                <span className="meta mt-0.5 block truncate text-[10px]">
                  {suggestion.sourceName} &middot; {suggestion.categoryLabel}
                </span>
              </span>
            </a>
          ))}

          {/* The escape hatch out of a six-row preview and into the real
              results page, with the count so it is worth taking. */}
          <button
            type="button"
            onClick={runSearch}
            onMouseEnter={() => setActive(-1)}
            className="flex w-full items-center gap-2 border-t px-3 py-2 text-left text-[12px] text-[var(--text-secondary)]"
            style={{
              borderColor: "var(--rule-strong)",
              backgroundColor: active === -1 ? "var(--ink-wash)" : "var(--surface-2)",
            }}
          >
            <CornerDownLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="shrink-0">See all {total.toLocaleString("en-IN")} matches for</span>
            <span className="truncate font-semibold text-[var(--text-primary)]">
              &ldquo;{query}&rdquo;
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
