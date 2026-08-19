import { Section } from "@/components/Section";
import { Bar, TextSkeleton } from "@/components/Skeleton";

/**
 * What a sector shows while its dashboard is being built.
 *
 * The root placeholder is shaped like a feed - a day header and a grid of
 * story tiles - which is the wrong promise here: tapping a sector on the board
 * led to something that looked like the front page loading, so the reader could
 * not tell whether the tap had gone where they meant it to. This one is shaped
 * like the dashboard that is coming: the sector's own header, the six-figure
 * stat row, the charts, then the market primer.
 *
 * It matters more on this route than on any other. The page runs live queries
 * and a model-written market read behind a 60s budget, so the wait is real
 * rather than theoretical.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-8 pt-6" role="status" aria-label="Opening the sector dashboard">
      <header className="animate-pulse border-b pb-6" style={{ borderColor: "var(--rule-strong)" }}>
        <Bar width="6rem" height={10} />
        <div className="mt-3 flex items-center gap-3">
          <span
            className="block h-11 w-11 shrink-0"
            style={{ backgroundColor: "var(--ink-wash)" }}
            aria-hidden
          />
          <Bar width="min(18rem, 60%)" height={38} />
        </div>
        <div className="measure mt-4">
          <TextSkeleton lines={2} />
        </div>
      </header>

      <Section
        index="01"
        title="The signal"
        accentVar="--cat-investment"
        description="Counting this sector's coverage out of the archive."
      >
        <div className="flex animate-pulse flex-col gap-9">
          <div className="grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="flex flex-col gap-2 border-l py-1 pl-3"
                style={{ borderColor: "var(--rule-strong)" }}
              >
                <Bar width="70%" height={9} />
                <Bar width="55%" height={24} />
                <Bar width="85%" height={9} />
              </div>
            ))}
          </div>

          {/* The two chart wells, at the height the real charts occupy, so the
              page does not jump when they land. */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartWell />
            <ChartWell />
          </div>
        </div>
      </Section>

      <Section
        index="02"
        title="The market"
        accentVar="--cat-tech"
        note="machine-written"
        description="Size, growth and the routes in - written on request, so this one takes a moment."
      >
        <div className="animate-pulse">
          <TextSkeleton lines={4} />
        </div>
      </Section>

      <span className="sr-only">Opening the sector dashboard…</span>
    </div>
  );
}

function ChartWell() {
  return (
    <div className="flex flex-col gap-3">
      <Bar width="9rem" height={10} />
      <span
        className="block h-[180px] w-full"
        style={{ backgroundColor: "var(--ink-wash)" }}
        aria-hidden
      />
    </div>
  );
}
