import type { ReactNode } from "react";

/**
 * The frame every page section sits in.
 *
 * Sections are drawn as panels: a ruled box with a tinted header strip and an
 * accent cap along the top edge. A page of loose rules under small labels read
 * as one undifferentiated column no matter how the labels were styled - an
 * enclosing border is what actually tells the eye where a section starts and
 * stops, and the accent ties a category page's panels to that category.
 */
export function Section({
  id,
  index,
  title,
  note,
  description,
  accentVar,
  flush = false,
  children,
}: {
  id?: string;
  /** Two-digit section marker, e.g. "01". Purely a wayfinding aid. */
  index?: string;
  title: string;
  note?: string;
  description?: string;
  accentVar?: string;
  /** Drop the body padding for content that supplies its own. */
  flush?: boolean;
  children: ReactNode;
}) {
  const accent = accentVar ? `var(${accentVar})` : "var(--text-primary)";

  // No scroll-margin on the section: `scroll-padding-top` on the document
  // handles clearing the sticky masthead, and it knows the header's three
  // heights where a fixed margin only ever matched one of them.
  return (
    <section id={id}>
      <div
        className="border"
        style={{
          borderColor: "var(--rule-strong)",
          // The accent rides the panel's own top edge rather than sitting
          // inside it as a separate bar, so the box stays one shape.
          borderTopWidth: "3px",
          borderTopColor: accent,
          backgroundColor: "var(--surface-1)",
        }}
      >
        <div
          className="border-b px-4 py-4 sm:px-5"
          style={{ borderColor: "var(--rule)", backgroundColor: "var(--surface-2)" }}
        >
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {index && (
              <span className="meta shrink-0 text-[13px]" style={{ color: accent }} aria-hidden>
                {index}
              </span>
            )}
            {/* The section name is the page's main wayfinding device, so it is
                set well above the body ramp - a reader scrolling fast should be
                able to land on it without reading anything else. */}
            <h2 className="headline text-[28px] leading-[1.12] font-semibold text-[var(--text-primary)] sm:text-[36px]">
              {title}
            </h2>
            {note && <span className="meta ml-auto shrink-0 text-[12px]">{note}</span>}
          </div>
          {description && (
            <p className="measure mt-1.5 text-[14px] leading-relaxed text-[var(--text-muted)]">
              {description}
            </p>
          )}
        </div>

        <div className={flush ? "" : "px-4 py-5 sm:px-5"}>{children}</div>
      </div>
    </section>
  );
}
