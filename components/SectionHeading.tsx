/**
 * Section label set against a full-width rule. Repeating this one shape for
 * every section is what makes the *contents* of each section read as
 * different — the frame stays constant so the material can vary.
 */
export function SectionHeading({
  title,
  note,
  accentVar,
}: {
  title: string;
  note?: string;
  accentVar?: string;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b pb-2" style={{ borderColor: "var(--rule-strong)" }}>
      <h2 className="kicker flex items-center gap-2 text-[var(--text-primary)]">
        {accentVar && (
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: `var(${accentVar})` }}
            aria-hidden
          />
        )}
        {title}
      </h2>
      {note && <span className="meta">{note}</span>}
    </div>
  );
}
