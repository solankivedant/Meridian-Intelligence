import type { Metadata } from "next";
import { Section } from "@/components/Section";
import { SavedShelf } from "@/components/SavedShelf";

export const metadata: Metadata = {
  title: "Saved stories",
  description: "The stories you have kept, stored in this browser.",
};

/**
 * The one page with no database behind it. Everything it shows was written by
 * this browser, so the route is a frame and the shelf inside it does the work.
 */
export default function SavedPage() {
  return (
    <div className="flex flex-col gap-8 pt-6">
      <header className="border-b pb-6" style={{ borderColor: "var(--rule-strong)" }}>
        <span className="kicker block text-[var(--cat-subsidy)]">Your reading list</span>
        <h1 className="headline mt-2 text-[32px] leading-[1.06] text-[var(--text-primary)] sm:text-[46px]">
          Saved stories
        </h1>
        <p className="measure mt-3 text-[15px] leading-relaxed text-[var(--text-secondary)]">
          Kept in this browser, not in an account — nothing here is sent anywhere.
          Each story is stored whole, so the list keeps working offline and holds on
          to items long after they have scrolled out of the archive.
        </p>
      </header>

      <Section
        index="01"
        title="Your shelf"
        accentVar="--cat-subsidy"
        description="Newest first. Use the bookmark on any card to take a story off the list."
      >
        <SavedShelf />
      </Section>
    </div>
  );
}
