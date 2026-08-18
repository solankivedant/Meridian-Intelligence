import { Section } from "@/components/Section";
import { FeedSkeleton, TextSkeleton } from "@/components/Skeleton";

/**
 * What every route shows while its data is in flight.
 *
 * All four desks open on the same thing — a panel header, a filter row, then a
 * day of tiles — so one placeholder covers the lot. Without it a slow query
 * leaves the reader on the previous page with nothing to say the click
 * registered, which is the moment people click again.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-8 pt-6">
      <div className="flex flex-col gap-3 pt-2">
        <TextSkeleton lines={1} />
      </div>

      <Section index="01" title="Latest stories" description="Fetching the archive.">
        <FeedSkeleton />
      </Section>
    </div>
  );
}
