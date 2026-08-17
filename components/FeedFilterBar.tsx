import Link from "next/link";
import { TIME_RANGES, TimeRangeKey, monthOptions } from "@/lib/timeRange";
import { TAG_META } from "@/lib/categorize";

function buildHref(basePath: string, params: { range?: string; tag?: string; month?: string }) {
  const search = new URLSearchParams();
  if (params.range) search.set("range", params.range);
  if (params.tag) search.set("tag", params.tag);
  if (params.month) search.set("month", params.month);
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

const SELECT_CLASS =
  "appearance-none rounded-none border-b bg-transparent py-1 pr-6 text-[13px] text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--text-primary)]";

/**
 * A single toolbar line rather than a stack of pill rows: ranges read as tabs,
 * the two dropdowns share one underline treatment, and the whole thing sits on
 * a rule so it reads as page furniture instead of content.
 */
export function FeedFilterBar({
  basePath,
  range,
  tag,
  month,
}: {
  basePath: string;
  range: TimeRangeKey;
  tag: string;
  month: string;
}) {
  const hasFilters = tag !== "" || month !== "";
  const months = monthOptions();

  return (
    <div className="mb-7 flex flex-wrap items-center gap-x-6 gap-y-3">
      <div className="flex items-center gap-0.5">
        {TIME_RANGES.map((r) => {
          const active = !month && r.key === range;
          return (
            <Link
              key={r.key}
              // Picking a relative range drops any active month selection —
              // the two are alternative browsing modes, not combined.
              href={buildHref(basePath, { range: r.key, tag })}
              aria-current={active ? "true" : undefined}
              className="border-b px-2 py-1 text-[13px] transition-colors"
              style={{
                borderColor: active ? "var(--text-primary)" : "transparent",
                color: active ? "var(--text-primary)" : "var(--text-muted)",
                fontWeight: active ? 600 : 400,
              }}
            >
              {r.label}
            </Link>
          );
        })}
      </div>

      <form action={basePath} method="GET" className="flex items-center gap-2">
        <input type="hidden" name="tag" value={tag} />
        <label className="kicker text-[var(--text-muted)]" htmlFor="month-select">
          Month
        </label>
        <select
          id="month-select"
          name="month"
          defaultValue={month}
          className={SELECT_CLASS}
          style={{ borderColor: month ? "var(--text-primary)" : "var(--rule-strong)" }}
        >
          <option value="">Any</option>
          {months.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
        <SubmitButton />
      </form>

      <form action={basePath} method="GET" className="flex items-center gap-2">
        <input type="hidden" name="range" value={range} />
        <input type="hidden" name="month" value={month} />
        <label className="kicker text-[var(--text-muted)]" htmlFor="tag-select">
          Sector
        </label>
        <select
          id="tag-select"
          name="tag"
          defaultValue={tag}
          className={SELECT_CLASS}
          style={{ borderColor: tag ? "var(--text-primary)" : "var(--rule-strong)" }}
        >
          <option value="">All</option>
          {TAG_META.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
        <SubmitButton />
      </form>

      {hasFilters && (
        <Link
          href={buildHref(basePath, { range })}
          className="kicker text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
        >
          Clear
        </Link>
      )}
    </div>
  );
}

function SubmitButton() {
  return (
    <button
      type="submit"
      className="kicker text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
    >
      Go
    </button>
  );
}
