"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Globe2, Radio, Bookmark, TrendingUp, Info, type LucideIcon } from "lucide-react";
import { SavedCount } from "./SavedCount";

/**
 * The masthead's standing nav.
 *
 * The drawer holds everything - two desks, eight sections, search, sources -
 * but a destination you have to open a menu to discover is a destination most
 * readers never find, and a page whose own name appears nowhere on screen is
 * one you can't place. These four are the top-level places; the sections stay
 * in the drawer, where their colour legend belongs.
 */
const LINKS: { href: string; label: string; icon: LucideIcon; accent?: string }[] = [
  { href: "/", label: "India", icon: MapPin },
  { href: "/world", label: "World", icon: Globe2 },
  { href: "/opportunities", label: "Sectors", icon: TrendingUp, accent: "var(--cat-investment)" },
  { href: "/about", label: "About", icon: Info },
  { href: "/saved", label: "Saved", icon: Bookmark, accent: "var(--cat-subsidy)" },
  { href: "/sources", label: "Sources", icon: Radio },
];

export function PrimaryNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="rail flex min-w-0 gap-1 overflow-x-auto"
    >
      {LINKS.map(({ href, label, icon: Icon, accent }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className="flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 py-2 text-[13px] transition-colors"
            style={{
              // The current page is marked by a rule under it, the way a tab
              // is - colour alone was too quiet to answer "where am I".
              borderColor: active ? (accent ?? "var(--text-primary)") : "transparent",
              color: active ? "var(--text-primary)" : "var(--text-secondary)",
              fontWeight: active ? 600 : 400,
            }}
          >
            <Icon
              className="h-3.5 w-3.5 shrink-0"
              style={accent ? { color: accent } : undefined}
              aria-hidden
            />
            {label}
            {href === "/saved" && <SavedCount />}
          </Link>
        );
      })}
    </nav>
  );
}
