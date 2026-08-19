import { AlertTriangle, Sparkles, TrendingUp, Route, Eye } from "lucide-react";
import type { SectorRead } from "@/lib/sectorBrief";
import { timeAgo } from "@/lib/formatTime";

/**
 * The market-side primer: size, growth, the ratios that matter for this
 * industry, what drives it, what breaks it, and the routes into it.
 *
 * This panel is the one place on the desk where the numbers are not counted off
 * our own rows, and its design is built around saying so. The provenance line
 * sits at the top rather than in small print at the bottom, every figure
 * carries the kind of source it would normally come from, and the panel is
 * visually set apart from the measured charts above it so a reader skimming can
 * see where arithmetic stops and estimate begins.
 */
export function SectorReadPanel({ read }: { read: SectorRead }) {
  return (
    <div className="flex flex-col gap-6">
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1 border-l-2 py-1.5 pl-3"
        style={{
          borderColor: "var(--cat-tech)",
          backgroundColor: "color-mix(in srgb, var(--cat-tech) 6%, transparent)",
        }}
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--cat-tech)" }} aria-hidden />
        <p className="text-[12.5px] leading-relaxed text-[var(--text-secondary)]">
          Written by <strong className="text-[var(--text-primary)]">{read.model}</strong>,{" "}
          {timeAgo(new Date(read.generatedAt))}. Every figure below is an{" "}
          <strong className="text-[var(--text-primary)]">approximation</strong> of the
          commonly published range — not a filing, a price, or a verified statistic,
          and not advice.
        </p>
      </div>

      <p className="measure text-[16.5px] leading-[1.65] text-[var(--text-primary)]">
        {read.overview}
      </p>

      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        {read.metrics.map((metric) => (
          <div
            key={metric.label}
            className="flex flex-col gap-1 border-l py-1 pl-3"
            style={{ borderColor: "var(--cat-tech)" }}
          >
            <span className="kicker text-[9px] text-[var(--text-muted)]">{metric.label}</span>
            <span className="text-[17px] leading-tight font-medium text-[var(--text-primary)]">
              {metric.value}
            </span>
            {metric.basis && (
              <span className="text-[11px] leading-snug text-[var(--text-muted)]">
                {metric.basis}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-x-10 gap-y-6 lg:grid-cols-2">
        <List
          icon={TrendingUp}
          title="What is driving it"
          items={read.drivers}
          accent="var(--cat-economy)"
        />
        <List
          icon={AlertTriangle}
          title="What could break it"
          items={read.risks}
          accent="var(--cat-geopolitics)"
        />
      </div>

      {read.exposure.length > 0 && (
        <div>
          <p className="kicker mb-2.5 flex items-center gap-1.5 text-[10px] text-[var(--text-primary)]">
            <Route className="h-3.5 w-3.5" style={{ color: "var(--cat-investment)" }} aria-hidden />
            Routes into the sector
          </p>
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {read.exposure.map((entry) => (
              <div
                key={entry.route}
                className="border-l py-0.5 pl-3"
                style={{ borderColor: "var(--rule-strong)" }}
              >
                <p className="text-[13.5px] font-medium text-[var(--text-primary)]">
                  {entry.route}
                </p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-[var(--text-secondary)]">
                  {entry.note}
                </p>
              </div>
            ))}
          </div>
          <p className="measure mt-3 text-[11.5px] leading-relaxed text-[var(--text-muted)]">
            Categories of exposure, not recommendations. No fund, stock or allocation
            is named, and nothing here accounts for your circumstances, costs or tax.
          </p>
        </div>
      )}

      {read.watchlist.length > 0 && (
        <List
          icon={Eye}
          title="What to watch next"
          items={read.watchlist}
          accent="var(--cat-policy)"
        />
      )}
    </div>
  );
}

function List({
  icon: Icon,
  title,
  items,
  accent,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties; "aria-hidden"?: boolean }>;
  title: string;
  items: string[];
  accent: string;
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <p className="kicker mb-2 flex items-center gap-1.5 text-[10px] text-[var(--text-primary)]">
        <Icon className="h-3.5 w-3.5" style={{ color: accent }} aria-hidden />
        {title}
      </p>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item}
            className="border-l py-0.5 pl-3 text-[13.5px] leading-relaxed text-[var(--text-secondary)]"
            style={{ borderColor: "var(--rule)" }}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Shown in place of the panel when the model is not configured or failed. */
export function SectorReadUnavailable({ configured }: { configured: boolean }) {
  return (
    <p
      className="measure border-l-2 py-1 pl-3 text-[13.5px] leading-relaxed text-[var(--text-secondary)]"
      style={{ borderColor: "var(--cat-geopolitics)" }}
    >
      {configured
        ? "The market primer could not be written just now. The measured signals above stand on their own — they are counted from this archive and do not depend on the model."
        : "Gemini is not configured on this deployment (GEMINI_API_KEY is unset), so the market primer — size, growth rate, sector ratios and routes in — is unavailable. Everything above is measured from the archive and is unaffected."}
    </p>
  );
}
