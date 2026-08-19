"use client";

import Link, { useLinkStatus } from "next/link";
import { ArrowUpRight, Loader2 } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

/**
 * The way through to a sector's own dashboard, with the wait made visible.
 *
 * The board is a table of figures, and a table of figures does not look like a
 * set of doors - readers tapped a sector and, because the dashboard behind it
 * is a live query plus a model-written primer, sat looking at an unchanged
 * board wondering whether the tap had registered. `useLinkStatus` is the hook
 * for exactly this: it reports the clicked link's own pending state, so the row
 * you touched is the row that says something, rather than a page-wide bar that
 * could belong to anything.
 *
 * The hint is a fixed slot that changes opacity rather than appearing from
 * nowhere, so nothing on the row moves when it lights up. A route-level
 * skeleton (`app/opportunities/[sector]/loading.tsx`) takes over the moment the
 * navigation commits; this only has to cover the gap before that.
 */
export function SectorLink({
  href,
  label,
  className,
  style,
  children,
  hint = "inline",
}: {
  href: string;
  /** The sector's name, for the accessible label and the pending caption. */
  label: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  /** `inline` sits after the row's own content; `swap` replaces a trailing icon. */
  hint?: "inline" | "swap";
}) {
  return (
    <Link
      href={href}
      title={`Open the ${label} dashboard`}
      className={className}
      style={style}
    >
      {children}
      {hint === "inline" ? <InlineHint /> : <SwapHint />}
    </Link>
  );
}

/** "Opening dashboard…" beside whatever was clicked. */
function InlineHint() {
  const { pending } = useLinkStatus();

  return (
    <span
      className="kicker flex shrink-0 items-center gap-1 text-[9px] whitespace-nowrap text-[var(--text-muted)] transition-opacity duration-150"
      style={{ opacity: pending ? 1 : 0 }}
      aria-hidden={!pending}
    >
      <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
      Opening dashboard
    </span>
  );
}

/**
 * The trailing arrow, which becomes the spinner while the click is in flight -
 * one glyph in one place, so the cell keeps its width either way.
 */
function SwapHint() {
  const { pending } = useLinkStatus();
  const Icon = pending ? Loader2 : ArrowUpRight;
  return <Icon className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} aria-hidden />;
}

/**
 * The accordion's full-width call to action, which has room to say where it is
 * going in words and so swaps its whole label while pending.
 */
export function SectorDashboardButton({
  href,
  label,
  accent,
}: {
  href: string;
  label: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      title={`Open the ${label} dashboard`}
      className="kicker flex items-center justify-center gap-1.5 border px-3 py-2 text-[10px] transition-colors"
      style={{
        borderColor: accent,
        color: accent,
        backgroundColor: `color-mix(in srgb, ${accent} 8%, var(--surface-1))`,
      }}
    >
      <ButtonLabel label={label} />
    </Link>
  );
}

function ButtonLabel({ label }: { label: string }) {
  const { pending } = useLinkStatus();

  if (pending) {
    return (
      <>
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        Opening the {label} dashboard
      </>
    );
  }

  return (
    <>
      View the detailed dashboard
      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
    </>
  );
}
