"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORY_META } from "@/lib/categoryMeta";

// The nav sticks while the masthead scrolls away, so the section you are
// reading stays addressable without a fixed header eating the viewport.
export function CategoryNav() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky top-0 z-20 border-y backdrop-blur-md"
      style={{
        borderColor: "var(--rule)",
        backgroundColor: "color-mix(in srgb, var(--paper) 88%, transparent)",
      }}
      aria-label="Categories"
    >
      <div className="rail mx-auto flex max-w-6xl gap-1 overflow-x-auto px-5 sm:px-8">
        <NavLink href="/" label="All" active={pathname === "/"} />
        {CATEGORY_META.map((meta) => {
          const href = `/category/${meta.slug}`;
          return (
            <NavLink
              key={meta.slug}
              href={href}
              label={meta.shortLabel}
              color={`var(${meta.colorVar})`}
              active={pathname === href}
            />
          );
        })}
      </div>
    </nav>
  );
}

function NavLink({
  href,
  label,
  color,
  active,
}: {
  href: string;
  label: string;
  color?: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="group relative shrink-0 whitespace-nowrap px-2.5 py-2.5 text-[13px] font-medium transition-colors"
      style={{ color: active ? "var(--text-primary)" : "var(--text-muted)" }}
    >
      <span className="inline-flex items-center gap-1.5">
        {color && (
          <span
            className="h-1.5 w-1.5 rounded-full transition-opacity"
            style={{ backgroundColor: color, opacity: active ? 1 : 0.45 }}
            aria-hidden
          />
        )}
        {label}
      </span>
      <span
        className="absolute inset-x-1.5 bottom-0 h-[2px] transition-opacity"
        style={{
          backgroundColor: color ?? "var(--text-primary)",
          opacity: active ? 1 : 0,
        }}
        aria-hidden
      />
    </Link>
  );
}
