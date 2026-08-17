import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { safeQuery } from "@/lib/safeQuery";
import { metaForSlug } from "@/lib/categoryMeta";
import { SectionHeading } from "@/components/SectionHeading";
import { ArticleRow } from "@/components/ArticleRow";
import { DayFeed } from "@/components/DayFeed";
import { FeedFilterBar } from "@/components/FeedFilterBar";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { withLeadFirst } from "@/lib/leadStory";
import { timeAgo } from "@/lib/formatTime";
import { normalizeRange, rangeCutoff, isValidMonthKey, monthDateRange } from "@/lib/timeRange";

export const revalidate = 0;

const PAGE_SIZE = 60;

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ range?: string; tag?: string; month?: string; page?: string }>;
}) {
  const { slug } = await params;
  const meta = metaForSlug(slug);
  if (!meta) notFound();

  const search = await searchParams;
  const range = normalizeRange(search.range);
  const tag = search.tag ?? "";
  const month = isValidMonthKey(search.month) ? search.month : "";
  const page = Math.max(1, Number.parseInt(search.page ?? "1", 10) || 1);
  const cutoff = rangeCutoff(range);

  const where: Prisma.ArticleWhereInput = {
    category: meta.category,
    ...(month ? { publishedAt: monthDateRange(month) } : cutoff ? { publishedAt: { gte: cutoff } } : {}),
    ...(tag ? { tags: { has: tag } } : {}),
  };

  const [articles, total] = await Promise.all([
    safeQuery(
      () =>
        db.article.findMany({
          where,
          orderBy: { publishedAt: "desc" },
          include: { source: true },
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        }),
      []
    ),
    safeQuery(() => db.article.count({ where }), 0),
  ]);

  // Only the first page of an unfiltered view gets a lead treatment — deeper
  // in the archive there is no "top story", just more of the record.
  const showLead = page === 1 && !tag && !month;
  const { lead, rest } = showLead
    ? withLeadFirst(articles)
    : { lead: undefined, rest: articles };

  const basePath = `/category/${meta.slug}`;

  return (
    <div className="flex flex-col gap-12 pt-8">
      <header
        className="border-b pb-6"
        style={{ borderColor: "var(--rule-strong)" }}
      >
        <span className="kicker flex items-center gap-2" style={{ color: `var(${meta.colorVar})` }}>
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: `var(${meta.colorVar})` }}
            aria-hidden
          />
          Section
        </span>
        <h1 className="headline mt-2 text-[32px] leading-[1.08] text-[var(--text-primary)] sm:text-[44px]">
          {meta.label}
        </h1>
        <p className="measure mt-3 text-[15px] leading-[1.65] text-[var(--text-secondary)]">
          {meta.description}
        </p>
      </header>

      {lead && (
        <section>
          <SectionHeading
            title="Leading this section"
            note={timeAgo(lead.publishedAt)}
            accentVar={meta.colorVar}
          />
          <ArticleRow article={lead} variant="lead" showCategory={false} />
        </section>
      )}

      <section>
        <SectionHeading
          title={month || tag || range !== "7d" ? "Archive" : "Latest"}
          note={total > 0 ? `${total.toLocaleString("en-IN")} stories` : undefined}
        />
        <FeedFilterBar basePath={basePath} range={range} tag={tag} month={month} />

        {rest.length === 0 ? (
          <EmptyState filtered />
        ) : (
          <>
            <DayFeed articles={rest} showCategory={false} />
            <Pagination
              basePath={basePath}
              params={{ range, tag, month }}
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
            />
          </>
        )}
      </section>
    </div>
  );
}
