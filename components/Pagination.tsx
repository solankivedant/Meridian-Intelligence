import Link from "next/link";

// The archive runs to thousands of stories, so the feed pages rather than
// truncating at an arbitrary cut-off with no way to see what's underneath.
export function Pagination({
  basePath,
  params,
  extra,
  page,
  pageSize,
  total,
}: {
  basePath: string;
  /**
   * The facets the current view is built from. Every one of them has to be
   * written back into the link: paging is a change of page and nothing else,
   * and a pager that quietly dropped `sort` and `cats` sent a reader who asked
   * for "oldest first, policy only" back to the default feed on page two.
   */
  params: {
    range?: string;
    tags?: string;
    cats?: string;
    sort?: string;
    month?: string;
  };
  /** Extra query values to preserve, e.g. a search term and its scope. */
  extra?: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  total: number;
}) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  if (lastPage <= 1) return null;

  const href = (target: number) => {
    const search = new URLSearchParams();
    if (params.range) search.set("range", params.range);
    if (params.tags) search.set("tags", params.tags);
    if (params.cats) search.set("cats", params.cats);
    if (params.sort) search.set("sort", params.sort);
    if (params.month) search.set("month", params.month);
    for (const [key, value] of Object.entries(extra ?? {})) {
      if (value) search.set(key, value);
    }
    if (target > 1) search.set("page", String(target));
    const qs = search.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav
      className="mt-10 flex items-center justify-between gap-4 border-t pt-5"
      style={{ borderColor: "var(--rule-strong)" }}
      aria-label="Pagination"
    >
      <PageLink href={href(page - 1)} disabled={page <= 1}>
        ← Newer
      </PageLink>
      <span className="meta">
        {first.toLocaleString("en-IN")}–{last.toLocaleString("en-IN")} of{" "}
        {total.toLocaleString("en-IN")}
      </span>
      <PageLink href={href(page + 1)} disabled={page >= lastPage}>
        Older →
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="kicker text-[var(--text-muted)] opacity-40" aria-disabled="true">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="kicker text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
    >
      {children}
    </Link>
  );
}
