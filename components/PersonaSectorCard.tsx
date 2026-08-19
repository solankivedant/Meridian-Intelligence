import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { PersonaSectorRead } from "@/lib/personaDesk";
import { Sparkline } from "./charts/Sparkline";
import { StoryLink } from "./StoryLink";
import { FALLING_HUE, RISING_HUE, count, percent, percentChange } from "./charts/chartUtils";
import { timeAgo } from "@/lib/formatTime";

/**
 * One tracked sector: what the archive measures about it, and what it is
 * actually saying right now.
 *
 * The two halves are the point. Figures on their own are a dashboard nobody
 * trusts - "state support 34%" means nothing without the notifications it was
 * counted from - and headlines on their own are a feed. Putting the three
 * latest stories directly under the sector's own numbers means every figure has
 * something to click through to, which is the same rule the sector desk works
 * on, in the space a persona page can afford.
 *
 * The market primer (size, CAGR, the ratios) deliberately is not here: it is a
 * model call per sector, and six of them on one page would be both slow and
 * expensive. The full dashboard is one click away and carries it.
 */
export function PersonaSectorCard({ read }: { read: PersonaSectorRead }) {
  const { meta, signal, articles } = read;
  const accent = `var(${meta.colorVar})`;
  const Icon = meta.icon;
  const momentum = signal?.momentum ?? null;
  const rising = (momentum ?? 0) >= 0;

  return (
    <div
      className="flex flex-col border"
      style={{
        borderColor: "var(--rule)",
        borderLeftWidth: "3px",
        borderLeftColor: accent,
        backgroundColor: "var(--surface-1)",
      }}
    >
      <div
        className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b px-3 py-2.5"
        style={{ borderColor: "var(--rule)", backgroundColor: "var(--surface-2)" }}
      >
        <span
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center"
          style={{
            color: accent,
            backgroundColor: `color-mix(in srgb, ${accent} 13%, transparent)`,
          }}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <Link
          href={`/opportunities/${meta.key}`}
          className="headline-tight min-w-0 flex-1 truncate text-[16px] text-[var(--text-primary)]"
        >
          <span className="link-underline">{meta.label}</span>
        </Link>
        {signal && <Sparkline points={signal.monthly} width={64} height={20} />}
      </div>

      {signal ? (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 px-3 py-3 sm:grid-cols-4">
          <Figure
            label="Momentum"
            value={percentChange(momentum)}
            tone={momentum === null ? "var(--text-muted)" : rising ? RISING_HUE : FALLING_HUE}
          />
          <Figure label="Stories" value={count(signal.total)} />
          <Figure label="State" value={percent(signal.policyShare)} />
          <Figure label="Capital" value={percent(signal.capitalShare)} />
        </dl>
      ) : (
        <p className="px-3 py-3 text-[13px] text-[var(--text-muted)]">
          Nothing measured in this window yet.
        </p>
      )}

      {articles.length > 0 && (
        <ul className="flex flex-col border-t px-3" style={{ borderColor: "var(--rule)" }}>
          {articles.map((article) => (
            <li
              key={article.id}
              className="border-b py-2 last:border-b-0"
              style={{ borderColor: "var(--rule)" }}
            >
              <StoryLink
                id={article.id}
                title={article.title}
                url={article.url}
                sourceName={article.source.name}
                category={article.category}
                publishedAt={article.publishedAt.toISOString()}
              >
                <span className="headline-tight line-clamp-2 text-[13.5px] text-[var(--text-primary)]">
                  <span className="link-underline">{article.title}</span>
                </span>
              </StoryLink>
              <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-[11px] text-[var(--text-secondary)]">
                  {article.source.name}
                </span>
                <span className="meta">{timeAgo(article.publishedAt)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <Link
        href={`/opportunities/${meta.key}`}
        className="kicker mt-auto flex items-center justify-between gap-2 border-t px-3 py-2 text-[9px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--ink-wash)] hover:text-[var(--text-primary)]"
        style={{ borderColor: "var(--rule)" }}
      >
        The full {meta.label} dashboard
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
      </Link>
    </div>
  );
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <dt className="kicker text-[9px] text-[var(--text-muted)]">{label}</dt>
      <dd
        className="mt-0.5 text-[15px] leading-none font-medium tabular-nums"
        style={{ color: tone ?? "var(--text-primary)" }}
      >
        {value}
      </dd>
    </div>
  );
}
