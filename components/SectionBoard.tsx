"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Rows visible in a section box at any one time. The whole point of the board. */
const ROWS = 2;

export type BoardSection = {
  key: string;
  label: string;
  /** Resolved CSS colour for the section, e.g. `var(--cat-policy)`. */
  color: string;
  /** Server-rendered glyph - an icon component cannot cross to the browser. */
  icon: ReactNode;
  /** Stories in this section under the current filters. */
  total: number;
  /** The section's own page. */
  href: string;
  /** Server-rendered story tiles, newest first. */
  tiles: ReactNode[];
};

/**
 * How many tiles make two rows at the current width.
 *
 * The grid itself is laid out in CSS, so the columns are always right even
 * before this resolves; what it decides is how many tiles to *show*, and that
 * is the difference between "two rows" and "two rows on a laptop and twelve on
 * a phone". Starts at the widest case so the server renders a full board.
 */
function useColumns(): number {
  const [columns, setColumns] = useState(3);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)");
    const medium = window.matchMedia("(min-width: 640px)");
    const read = () => setColumns(wide.matches ? 3 : medium.matches ? 2 : 1);

    read();
    wide.addEventListener("change", read);
    medium.addEventListener("change", read);
    return () => {
      wide.removeEventListener("change", read);
      medium.removeEventListener("change", read);
    };
  }, []);

  return columns;
}

/**
 * Every section, boxed, two rows deep, each paging in place.
 *
 * Paging happens inside the box and without a round trip because the whole
 * point of the board is that the sections stay side by side: sending the reader
 * to another URL to see more of one section would put them back in the flat
 * feed this replaced. The tiles are rendered on the server and passed through
 * as nodes - this component decides which are on screen and nothing else.
 */
export function SectionBoard({ sections }: { sections: BoardSection[] }) {
  const columns = useColumns();
  const pageSize = columns * ROWS;
  const [pages, setPages] = useState<Record<string, number>>({});

  return (
    <div className="flex flex-col gap-5">
      {sections.map((section) => {
        const pageCount = Math.max(1, Math.ceil(section.tiles.length / pageSize));
        // Clamped on read rather than reset on resize: narrowing the window
        // shrinks the page size, and a stored page 4 would otherwise land the
        // box on nothing at all.
        const page = Math.min(pages[section.key] ?? 0, pageCount - 1);
        const visible = section.tiles.slice(page * pageSize, page * pageSize + pageSize);
        const step = (delta: number) =>
          setPages((current) => ({
            ...current,
            [section.key]: Math.min(Math.max(page + delta, 0), pageCount - 1),
          }));

        return (
          <section
            key={section.key}
            className="border"
            style={{
              borderColor: "var(--rule-strong)",
              borderTopWidth: "3px",
              borderTopColor: section.color,
              backgroundColor: "var(--surface-1)",
            }}
          >
            <header
              className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b px-3 py-2 sm:px-4"
              style={{ borderColor: "var(--rule)", backgroundColor: "var(--surface-2)" }}
            >
              {section.icon}
              <h3 className="headline text-[18px] leading-none text-[var(--text-primary)] sm:text-[20px]">
                {section.label}
              </h3>
              <span className="meta shrink-0">
                {section.total.toLocaleString("en-IN")}{" "}
                {section.total === 1 ? "story" : "stories"}
              </span>

              <span className="ml-auto flex shrink-0 items-center gap-1.5">
                <span className="meta tabular-nums">
                  {page + 1}/{pageCount}
                </span>
                <Step
                  label={`Newer stories in ${section.label}`}
                  disabled={page === 0}
                  onClick={() => step(-1)}
                >
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                </Step>
                <Step
                  label={`Next stories in ${section.label}`}
                  disabled={page >= pageCount - 1}
                  onClick={() => step(1)}
                >
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                </Step>
                <Link
                  href={section.href}
                  className="kicker border px-2 py-1 text-[9px] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                  style={{ borderColor: "var(--rule-strong)" }}
                >
                  All
                </Link>
              </span>
            </header>

            <div className="story-grid grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3">
              {visible}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Step({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center border transition-colors disabled:opacity-30 enabled:hover:bg-[var(--ink-wash)]"
      style={{ borderColor: "var(--rule-strong)", color: "var(--text-secondary)" }}
    >
      {children}
    </button>
  );
}
