"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { SectorSignal } from "@/lib/opportunity";
import { metaForSector } from "@/lib/sectorMeta";
import { Sparkline } from "./charts/Sparkline";
import { FALLING_HUE, RISING_HUE, count, percent, percentChange } from "./charts/chartUtils";
import { SectorDashboardButton } from "./SectorLink";

/**
 * The sector board on a narrow screen.
 *
 * The table is eight columns wide and cannot honestly be made narrower - the
 * columns are the comparison - so on a phone it was put behind a horizontal
 * scroller. That is the worst of both: the ranking, which is the one thing the
 * page is for, sits in the first column and every figure that would justify it
 * is off-screen to the right, and nothing about the page says to swipe.
 *
 * So on narrow screens the same rows become a list you read downwards. Each
 * row shows the rank, the sector and its momentum - enough to scan the ranking
 * without opening anything - and tapping one expands the rest of that row's
 * table in place: shape, momentum, state support, capital, coverage, and the
 * way through to its dashboard. One row is open at a time, so opening a second
 * closes the first and the list never grows past what a thumb can cover.
 */
export function SectorAccordion({ signals }: { signals: SectorSignal[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <ul className="flex flex-col border-t" style={{ borderColor: "var(--rule-strong)" }}>
      {signals.map((signal, i) => {
        const meta = metaForSector(signal.key);
        const Icon = meta.icon;
        const accent = `var(${meta.colorVar})`;
        const open = openKey === signal.key;
        const momentum = signal.momentum;
        const rising = (momentum ?? 0) >= 0;

        return (
          <li key={signal.key} className="border-b" style={{ borderColor: "var(--rule)" }}>
            <button
              type="button"
              aria-expanded={open}
              // Toggling to null rather than to this key is what makes a second
              // tap on the open row close it again.
              onClick={() => setOpenKey(open ? null : signal.key)}
              className="flex w-full items-center gap-3 px-1 py-3 text-left transition-colors hover:bg-[var(--ink-wash)]"
              style={{
                boxShadow: open ? `inset 3px 0 0 0 ${accent}` : undefined,
                backgroundColor: open ? "var(--ink-wash)" : undefined,
              }}
            >
              <span className="meta w-6 shrink-0 text-[var(--text-muted)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center"
                style={{
                  color: accent,
                  backgroundColor: `color-mix(in srgb, ${accent} 13%, transparent)`,
                }}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 text-[14px] font-medium text-[var(--text-primary)]">
                {signal.label}
              </span>
              <span
                className="meta shrink-0 text-[12px]"
                style={{
                  color:
                    momentum === null
                      ? "var(--text-muted)"
                      : rising
                        ? RISING_HUE
                        : FALLING_HUE,
                }}
              >
                {percentChange(momentum)}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform ${
                  open ? "rotate-180" : ""
                }`}
                aria-hidden
              />
            </button>

            {open && (
              <div className="flex flex-col gap-3 px-1 pb-4">
                <div
                  className="flex items-center justify-between gap-3 border px-3 py-2"
                  style={{ borderColor: "var(--rule)", backgroundColor: "var(--surface-2)" }}
                >
                  <span className="flex flex-col">
                    <span className="kicker text-[9px] text-[var(--text-muted)]">Shape</span>
                    <span className="meta mt-0.5 text-[11px]">Monthly coverage, 24 months</span>
                  </span>
                  <Sparkline points={signal.monthly} width={104} height={28} />
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Figure
                    label="Momentum"
                    value={percentChange(momentum)}
                    note="Share vs prior quarter"
                    tone={
                      momentum === null
                        ? "var(--text-muted)"
                        : rising
                          ? RISING_HUE
                          : FALLING_HUE
                    }
                  />
                  <Figure
                    label="Stories"
                    value={count(signal.total)}
                    note={`${count(signal.recent)} this quarter`}
                  />
                  <Figure
                    label="State"
                    value={percent(signal.policyShare)}
                    note="Policy or subsidy news"
                  />
                  <Figure
                    label="Capital"
                    value={percent(signal.capitalShare)}
                    note="Investment and FDI news"
                  />
                </dl>

                <SectorDashboardButton
                  href={`/opportunities/${signal.key}`}
                  label={signal.label}
                  accent={accent}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Figure({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone?: string;
}) {
  return (
    <div>
      <dt className="kicker text-[9px] text-[var(--text-muted)]">{label}</dt>
      <dd
        className="mt-0.5 text-[17px] leading-none font-medium tabular-nums"
        style={{ color: tone ?? "var(--text-primary)" }}
      >
        {value}
        <span className="meta mt-1 block text-[10px] font-normal">{note}</span>
      </dd>
    </div>
  );
}
