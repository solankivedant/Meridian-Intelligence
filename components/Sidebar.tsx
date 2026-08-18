"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Globe2, MapPin, Radio, Search } from "lucide-react";
import { CATEGORY_META } from "@/lib/categoryMeta";

/**
 * Primary navigation. This replaced a horizontal category rail: with two desks,
 * eight sections, search and the sources page, the rail had become a wall of
 * same-sized chips that told you nothing about where you were. A drawer can
 * group them under headings and mark the current page unambiguously.
 */
export function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    // The drawer covers the page; letting the page scroll underneath it makes
    // the wheel do two different things depending on where the pointer is.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        aria-expanded={open}
        className="flex h-9 w-9 shrink-0 items-center justify-center border transition-colors hover:bg-[var(--ink-wash)]"
        style={{ borderColor: "var(--rule-strong)", color: "var(--text-primary)" }}
      >
        <Menu className="h-4.5 w-4.5" strokeWidth={2} aria-hidden />
      </button>

      {/* Portalled to <body>: the header carries `backdrop-blur`, and a
          backdrop-filter makes its element the containing block for fixed
          descendants — left in place, the drawer sized itself to the header
          instead of the viewport and opened as a stub in the top-left. */}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Navigation">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setOpen(false)}
              className="absolute inset-0 cursor-default backdrop-blur-[2px]"
              style={{ backgroundColor: "color-mix(in srgb, var(--paper) 55%, transparent)" }}
            />

            <nav
              className="relative flex h-full w-[19rem] max-w-[85vw] flex-col overflow-y-auto border-r shadow-2xl"
              style={{ borderColor: "var(--rule-strong)", backgroundColor: "var(--surface-1)" }}
            >
              <div
                className="flex items-center justify-between border-b px-5 py-4"
                style={{ borderColor: "var(--rule)" }}
              >
                <span className="kicker text-[var(--text-muted)]">Navigate</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close navigation"
                  className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>

              <div className="border-b px-5 py-4" style={{ borderColor: "var(--rule)" }}>
                <form action="/search" method="GET" className="flex items-center gap-2">
                  <Search className="h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden />
                  <input
                    type="search"
                    name="q"
                    placeholder="Search the archive"
                    aria-label="Search the archive"
                    className="min-w-0 flex-1 border-b bg-transparent py-1 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--text-primary)]"
                    style={{ borderColor: "var(--rule-strong)" }}
                  />
                </form>
              </div>

              <Group label="Desks">
                <Item href="/" label="India" icon={MapPin} active={pathname === "/"} onNavigate={close} />
                <Item href="/world" label="World" icon={Globe2} active={pathname === "/world"} onNavigate={close} />
              </Group>

              <Group label="Sections">
                {CATEGORY_META.map((meta) => {
                  const href = `/category/${meta.slug}`;
                  return (
                    <Item
                      key={meta.slug}
                      href={href}
                      label={meta.label}
                      color={`var(${meta.colorVar})`}
                      active={pathname === href}
                      onNavigate={close}
                    />
                  );
                })}
              </Group>

              <Group label="About">
                <Item href="/sources" label="Sources" icon={Radio} active={pathname === "/sources"} onNavigate={close} />
              </Group>
            </nav>
          </div>,
          document.body
        )}
    </>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b py-3" style={{ borderColor: "var(--rule)" }}>
      <p className="kicker px-5 pb-1.5 text-[10px] text-[var(--text-muted)]">{label}</p>
      {children}
    </div>
  );
}

function Item({
  href,
  label,
  color,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  color?: string;
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      // The drawer is transient, so it dismisses itself on the way out. Doing
      // this here rather than in an effect on the pathname avoids a cascading
      // re-render on every navigation.
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className="flex items-center gap-2.5 px-5 py-1.5 text-[14px] transition-colors"
      style={{
        color: active ? "var(--text-primary)" : "var(--text-secondary)",
        fontWeight: active ? 600 : 400,
        backgroundColor: active ? "var(--ink-wash)" : "transparent",
        boxShadow: active ? "inset 3px 0 0 0 " + (color ?? "var(--text-primary)") : undefined,
      }}
    >
      {Icon ? (
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      ) : (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: color, opacity: active ? 1 : 0.55 }}
          aria-hidden
        />
      )}
      {label}
    </Link>
  );
}
