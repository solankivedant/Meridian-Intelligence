import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Users } from "lucide-react";
import { Section } from "@/components/Section";
import { SectionIcon } from "@/components/MetaIcon";
import { SectorIcon } from "@/components/MetaIcon";
import { metaForCategory } from "@/lib/categoryMeta";
import { metaForSector } from "@/lib/sectorMeta";
import { PERSONAS } from "@/lib/personas";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Reader desks",
  description:
    "The same archive read as a set of different jobs - citizen, student, founder, business owner, investor and public sector - each with its own ranked feed and the sectors it should be watching.",
};

/**
 * The way in to the persona desks.
 *
 * Worth a page of its own rather than only sidebar links, because the idea
 * needs one sentence of explanation before it is useful: these are not
 * separate feeds, they are several readings of one archive, and a reader who
 * thinks they are subscriptions will not understand why a story appears on two
 * of them.
 */
export default function ReaderDesks() {
  return (
    <div className="flex flex-col gap-8 pt-6">
      <header className="border-b pb-6" style={{ borderColor: "var(--rule-strong)" }}>
        <span className="kicker flex items-center gap-1.5 text-[var(--text-secondary)]">
          <Users className="h-3.5 w-3.5" aria-hidden />
          Reader desks
        </span>
        <h1 className="headline mt-2 text-[32px] leading-[1.06] text-[var(--text-primary)] sm:text-[46px]">
          Read it as your job
        </h1>
        <p className="measure mt-3 text-[15px] leading-relaxed text-[var(--text-secondary)]">
          Every other way into this archive sorts stories by what they are - the
          section they belong to, the sector they touch, the day they were filed.
          That is the right index once you know what you are looking for. These
          {PERSONAS.length} sort by <strong>who is reading</strong> instead: a
          founder and a student open the same semiconductor scheme for
          completely different reasons, and neither of them went looking for
          &ldquo;Policy &amp; Regulatory, last 7 days&rdquo;.
        </p>
        <p
          className="measure mt-3 border-l-2 pl-3 text-[13px] leading-relaxed text-[var(--text-muted)]"
          style={{ borderColor: "var(--rule-strong)" }}
        >
          Nothing here is a separate feed and no story is tagged with a desk. Each
          one is a saved reading of the same archive - a weighted set of sections
          and sectors - so a story that matters to three of them appears on all
          three, and every figure is the same measured figure it is everywhere
          else on the site.
        </p>
      </header>

      <Section
        index="01"
        title="The desks"
        note={`${PERSONAS.length} desks`}
        description="Each carries a ranked front page, the sectors it tracks with their coverage signals, and the whole archive scoped to it."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {PERSONAS.map((persona) => {
            const Icon = persona.icon;
            const accent = `var(${persona.colorVar})`;

            return (
              <Link
                key={persona.key}
                href={`/for/${persona.key}`}
                className="group flex flex-col gap-3 border p-4 transition-colors hover:border-[var(--rule-strong)]"
                style={{
                  borderColor: "var(--rule)",
                  borderLeftWidth: "3px",
                  borderLeftColor: accent,
                  backgroundColor: "var(--surface-1)",
                }}
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center"
                    style={{
                      color: accent,
                      backgroundColor: `color-mix(in srgb, ${accent} 13%, transparent)`,
                    }}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="headline-tight block text-[18px] text-[var(--text-primary)]">
                      <span className="link-underline">{persona.title}</span>
                    </span>
                    <span className="meta mt-0.5 block">{persona.label}</span>
                  </span>
                  <ArrowUpRight
                    className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-colors group-hover:text-[var(--text-primary)]"
                    aria-hidden
                  />
                </span>

                <span className="text-[13.5px] leading-relaxed text-[var(--text-secondary)]">
                  {persona.hint}
                </span>

                <span
                  className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-t pt-2.5"
                  style={{ borderColor: "var(--rule)" }}
                >
                  {persona.categories.map((category) => {
                    const meta = metaForCategory(category);
                    return (
                      <span
                        key={meta.slug}
                        className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]"
                      >
                        <SectionIcon meta={meta} size="xs" />
                        {meta.shortLabel}
                      </span>
                    );
                  })}
                </span>

                <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  {persona.sectors.map((key) => (
                    <span
                      key={key}
                      className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]"
                    >
                      <SectorIcon sector={key} size="xs" />
                      {metaForSector(key).label}
                    </span>
                  ))}
                </span>
              </Link>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
