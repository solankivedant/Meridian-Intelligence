import { Sparkles } from "lucide-react";
import { Region } from "@/lib/enums";
import { TIME_RANGES, TimeRangeKey } from "@/lib/timeRange";

/** A topic is a phrase, not a query language; longer than this is a paste. */
export const MAX_TOPIC_LENGTH = 120;

export const DESK_OPTIONS: { key: string; label: string; region?: Region }[] = [
  { key: "india", label: "India desk", region: Region.INDIA },
  { key: "world", label: "World desk", region: Region.WORLD },
  { key: "both", label: "Both desks" },
];

/**
 * The one control on the personalised desk: the topic, the window it reads,
 * and which desk it reads from.
 *
 * A plain GET form on purpose — the resulting desk is a URL, so a topic the
 * reader follows can be bookmarked, shared, or pinned as a tab, and the page
 * needs no client JavaScript to work.
 */
export function TopicForm({
  topic,
  range,
  desk,
}: {
  topic: string;
  range: TimeRangeKey;
  desk: string;
}) {
  return (
    <form
      action="/my-desk"
      method="GET"
      className="mt-6 border p-4"
      style={{ borderColor: "var(--rule-strong)", backgroundColor: "var(--surface-2)" }}
    >
      <label className="kicker block text-[10px] text-[var(--text-muted)]" htmlFor="topic">
        The topic you follow
      </label>
      <div
        className="mt-1.5 flex items-center gap-2 border-b pb-1.5"
        style={{ borderColor: "var(--rule-strong)" }}
      >
        <Sparkles className="h-4 w-4 shrink-0 text-[var(--cat-tech)]" aria-hidden />
        <input
          id="topic"
          type="text"
          name="topic"
          defaultValue={topic}
          maxLength={MAX_TOPIC_LENGTH}
          autoComplete="off"
          placeholder="e.g. semiconductor fab incentives"
          className="min-w-0 flex-1 bg-transparent text-[17px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Field label="Window" name="range" defaultValue={range}>
          {TIME_RANGES.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </Field>

        <Field label="Source" name="desk" defaultValue={desk}>
          {DESK_OPTIONS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </Field>

        <button
          type="submit"
          className="kicker ml-auto px-3.5 py-2 text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--cat-tech)" }}
        >
          Build my brief
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  children,
}: {
  label: string;
  name: string;
  defaultValue: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="kicker text-[10px] text-[var(--text-muted)]">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="border bg-transparent px-2 py-1 text-[13px] text-[var(--text-primary)] outline-none"
        style={{ borderColor: "var(--rule-strong)" }}
      >
        {children}
      </select>
    </label>
  );
}
