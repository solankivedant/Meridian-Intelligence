import Link from "next/link";
import { ArrowUpRight, TrendingUp } from "lucide-react";
import type { SectorSignal } from "@/lib/opportunity";
import { Sparkline } from "./charts/Sparkline";
import { SectorIcon } from "./MetaIcon";
import { count, percent, percentChange } from "./charts/chartUtils";

/**
 * The front page's way into the sector desk.
 *
 * A whole dashboard nobody knows about is a dashboard nobody opens, and the
 * front page is where readers already are. Rather than a banner advertising the
 * feature, this shows the actual finding - the three sectors accelerating
 * hardest right now - so the strip is worth reading even for someone who never
 * clicks it. Everything shown is measured; the framing says so.
 */
export function OpportunityStrip({ movers }: { movers: SectorSignal[] }) {
  if (movers.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {movers.map((signal, i) => (
          <Link
            key={signal.key}
            href={`/opportunities/${signal.key}`}
            className="group flex flex-col gap-2 border p-4 transition-colors hover:border-[var(--rule-strong)]"
            style={{
              borderColor: "var(--rule)",
              borderLeftWidth: "3px",
              borderLeftColor: "var(--cat-investment)",
              backgroundColor: "var(--surface-1)",
            }}
          >
            <span className="flex items-center gap-2">
              <span
                className="meta inline-flex h-[18px] min-w-[22px] items-center justify-center px-1 text-[11px] font-semibold leading-none"
                style={{
                  color: "var(--cat-investment)",
                  backgroundColor: "color-mix(in srgb, var(--cat-investment) 13%, transparent)",
                }}
                aria-hidden
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <SectorIcon sector={signal.key} size="md" />
              <span className="headline-tight min-w-0 flex-1 truncate text-[16px] text-[var(--text-primary)]">
                <span className="link-underline">{signal.label}</span>
              </span>
              <ArrowUpRight
                className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)] transition-colors group-hover:text-[var(--text-primary)]"
                aria-hidden
              />
            </span>

            <span className="flex items-end justify-between gap-3">
              <span className="flex flex-col">
                <span
                  className="text-[22px] leading-none font-medium tabular-nums"
                  style={{
                    color:
                      (signal.momentum ?? 0) >= 0 ? "var(--cat-policy)" : "var(--cat-subsidy)",
                  }}
                >
                  {percentChange(signal.momentum)}
                </span>
                <span className="meta mt-1">
                  {count(signal.recent)} stories this quarter
                </span>
              </span>
              <Sparkline points={signal.monthly} width={78} height={24} />
            </span>

            <span className="meta border-t pt-2" style={{ borderColor: "var(--rule)" }}>
              {percent(signal.policyShare)} state-driven · {percent(signal.capitalShare)} capital
            </span>
          </Link>
        ))}
      </div>

      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[var(--text-muted)]">
        <TrendingUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          Coverage momentum across 25 sectors - attention, not returns, and not advice.
        </span>
        <Link
          href="/opportunities"
          className="font-medium text-[var(--text-secondary)] underline underline-offset-2 transition-colors hover:text-[var(--text-primary)]"
        >
          Open the sector desk
        </Link>
      </p>
    </div>
  );
}
