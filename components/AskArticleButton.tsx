"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Sparkles, Loader2, X } from "lucide-react";

const SUGGESTIONS = [
  "Why does this matter for a small business?",
  "What changes in practice, and from when?",
  "Which sectors are most affected?",
];

/**
 * Opens in an overlay rather than expanding in place. Inside a dense feed an
 * inline panel shoved every following row down the page on each click; a
 * centred sheet keeps the reader's position and gives the answer room to be
 * read.
 */
export function AskArticleButton({
  articleId,
  title,
}: {
  articleId: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setQuestion(trimmed);
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId, question: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setAnswer(data.answer || "No answer returned.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void ask(question);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="kicker inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
      >
        <Sparkles className="h-3 w-3" aria-hidden />
        Ask
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Ask about this article"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default backdrop-blur-[2px]"
            style={{ backgroundColor: "color-mix(in srgb, var(--paper) 55%, transparent)" }}
          />

          <div
            className="relative flex max-h-[85vh] w-full max-w-xl flex-col gap-4 overflow-y-auto border p-5 shadow-2xl sm:rounded-lg"
            style={{ borderColor: "var(--rule-strong)", backgroundColor: "var(--surface-1)" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <span className="kicker text-[var(--text-muted)]">Ask about</span>
                <p className="headline-tight mt-1 text-[16px] text-[var(--text-primary)]">
                  {title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                aria-label="Close"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What do you want to know?"
                maxLength={300}
                className="min-w-0 flex-1 border-b bg-transparent py-1.5 text-[14px] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--text-primary)]"
                style={{ borderColor: "var(--rule-strong)" }}
              />
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="kicker flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-white transition-opacity disabled:opacity-40"
                style={{ backgroundColor: "var(--cat-policy)" }}
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : "Ask"}
              </button>
            </form>

            {!answer && !loading && !error && (
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void ask(s)}
                    className="border px-2.5 py-1 text-left text-[12px] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                    style={{ borderColor: "var(--rule)" }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {error && <p className="text-[13px] text-[var(--cat-geopolitics)]">{error}</p>}

            {answer && (
              <p
                className="border-t pt-4 text-[14px] leading-[1.7] whitespace-pre-wrap text-[var(--text-secondary)]"
                style={{ borderColor: "var(--rule)" }}
              >
                {answer}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
