import { AlertTriangle, LineChart } from "lucide-react";
import type { SectorBridge } from "@/lib/instruments";

/**
 * What tracks this sector, if anything.
 *
 * Two things make this panel work rather than read as filler. The first is
 * that it says nothing it cannot support: index names and exchanges, no
 * symbols, no levels, no returns - see the note at the top of
 * `lib/instruments.ts` for why that boundary is where it is.
 *
 * The second is that the *absence* of an instrument is given the same weight
 * as its presence. A panel that only ever appeared for the fifteen sectors
 * with a neat index would quietly teach the reader that every sector has one.
 * The gap notice is styled as a finding, not as an error state, because on
 * this desk that is exactly what it is: the sector is loud and nothing on
 * either exchange tracks it.
 */
export function InstrumentPanel({ bridge }: { bridge: SectorBridge | undefined }) {
  if (!bridge) {
    return (
      <p className="text-[14px] leading-relaxed text-[var(--text-muted)]">
        No instrument mapping has been written for this sector yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {bridge.indices.length > 0 ? (
        <ul className="flex flex-col gap-2.5">
          {bridge.indices.map((index) => (
            <li
              key={`${index.venue}-${index.name}`}
              className="flex items-start gap-3 border-l-2 pl-3"
              style={{ borderColor: "var(--rule-strong)" }}
            >
              <LineChart
                className="mt-[3px] h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]"
                aria-hidden
              />
              <span className="min-w-0">
                <span className="text-[14.5px] font-medium text-[var(--text-primary)]">
                  {index.name}
                </span>
                <span className="meta ml-2 text-[10px]">{index.venue}</span>
                {index.note && (
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-[var(--text-muted)]">
                    {index.note}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {bridge.gap && (
        <p
          className="flex items-start gap-2.5 border-l-2 py-1 pl-3 text-[13.5px] leading-relaxed text-[var(--text-secondary)]"
          style={{ borderColor: "var(--cat-geopolitics)" }}
        >
          <AlertTriangle
            className="mt-[3px] h-3.5 w-3.5 shrink-0"
            style={{ color: "var(--cat-geopolitics)" }}
            aria-hidden
          />
          <span>
            <span className="kicker mr-1.5 text-[9px] text-[var(--cat-geopolitics)]">Gap</span>
            {bridge.gap}
          </span>
        </p>
      )}

      <p className="measure text-[13.5px] leading-relaxed text-[var(--text-secondary)]">
        {bridge.access}
      </p>
    </div>
  );
}

/**
 * The one-line version, for a page that has already spent its space.
 *
 * Used on the sector board, where twenty-five rows cannot each carry the full
 * panel but the reader should still be able to see at a glance which sectors
 * have somewhere to look and which do not.
 */
export function InstrumentSummary({ bridge }: { bridge: SectorBridge | undefined }) {
  if (!bridge || bridge.indices.length === 0) {
    return <span className="meta text-[11px] text-[var(--text-muted)]">No index</span>;
  }
  const [first, ...rest] = bridge.indices;
  return (
    <span className="text-[12.5px] text-[var(--text-secondary)]">
      {first.name}
      {rest.length > 0 && (
        <span className="meta ml-1.5 text-[10px]">+{rest.length}</span>
      )}
    </span>
  );
}
