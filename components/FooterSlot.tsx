"use client";

import { usePathname } from "next/navigation";

/**
 * The site footer, everywhere except the page that already is one.
 *
 * `/about` carries the same colophon at full size as its opening section, and
 * repeating a photo and a name six inches further down reads as a template
 * misfiring rather than as a footer. The alternative - a route group with its
 * own layout - would mean moving every other page into a sibling group to buy
 * one page an exception, so the exception lives here instead, next to the thing
 * it is an exception to.
 *
 * The footer itself stays a server component; it arrives as children.
 */
const WITHOUT_FOOTER = new Set(["/about"]);

export function FooterSlot({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (WITHOUT_FOOTER.has(pathname)) return null;
  return <>{children}</>;
}
