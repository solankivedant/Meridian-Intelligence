/**
 * Re-runs the sector tagger over stored articles:
 *
 *   npm run retag            # dry run - reports what would change
 *   npm run retag -- --apply # writes
 *
 * Sector tags are computed once, at ingest, from a story's headline and
 * excerpt. That is the right place for it - it costs nothing per row and keeps
 * the read path a plain indexed query - but it means a *new* sector added to
 * `lib/categorize.ts` applies only to stories ingested after it. Without this,
 * a sector added today reads as a sector nobody has ever written about.
 *
 * Deliberately additive: it only ever adds tags a rule now matches, never
 * removes one already stored. A full recompute would also silently drop tags
 * whose rules were tightened since a row was written, which is a much larger
 * and much less obvious change than "the new sector now has its stories".
 *
 * Writes are grouped by the resulting tag set rather than issued per row.
 * Thousands of articles share an identical set, so this collapses tens of
 * thousands of round trips into a few hundred `updateMany` calls.
 */
import "dotenv/config";
import { db } from "../lib/db";
import { categorize } from "../lib/categorize";

const APPLY = process.argv.includes("--apply");
/** Rows per read. Large enough to be few round trips, small enough to hold. */
const PAGE = 5000;

async function main() {
  const total = await db.article.count();
  console.log(`${total.toLocaleString("en-IN")} articles. ${APPLY ? "APPLYING" : "Dry run"}.\n`);

  // id -> the tags it should gain, keyed by the sorted set so identical
  // outcomes share one write.
  const byTagSet = new Map<string, string[]>();
  const added = new Map<string, number>();
  let changed = 0;
  let cursor: string | undefined;

  for (;;) {
    const rows = await db.article.findMany({
      select: { id: true, title: true, excerpt: true, tags: true, category: true },
      orderBy: { id: "asc" },
      take: PAGE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (rows.length === 0) break;
    cursor = rows[rows.length - 1].id;

    for (const row of rows) {
      const { tags: computed } = categorize(row.title, row.excerpt, row.category);
      const missing = computed.filter((tag) => !row.tags.includes(tag));
      if (missing.length === 0) continue;

      changed++;
      for (const tag of missing) added.set(tag, (added.get(tag) ?? 0) + 1);

      const next = [...row.tags, ...missing];
      const key = next.slice().sort().join("|");
      if (!byTagSet.has(key)) byTagSet.set(key, next);
      (idsFor(key) as string[]).push(row.id);
    }

    process.stdout.write(`  scanned ${Math.min(total, (cursor ? 1 : 0) + changed + 0)}\r`);
  }

  console.log(`\n${changed.toLocaleString("en-IN")} articles would gain at least one tag.\n`);
  console.log("Tags gained:");
  for (const [tag, count] of [...added].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${tag.padEnd(22)} +${count.toLocaleString("en-IN")}`);
  }

  if (!APPLY) {
    console.log("\nNothing written. Re-run with --apply to write.");
    return;
  }

  console.log(`\nWriting in ${byTagSet.size.toLocaleString("en-IN")} groups...`);
  let written = 0;
  for (const [key, tags] of byTagSet) {
    const ids = idsFor(key);
    const { count } = await db.article.updateMany({
      where: { id: { in: ids } },
      data: { tags },
    });
    written += count;
  }
  console.log(`Updated ${written.toLocaleString("en-IN")} rows.`);
}

// Ids per tag-set key, kept beside the map above.
const ids = new Map<string, string[]>();
function idsFor(key: string): string[] {
  let list = ids.get(key);
  if (!list) {
    list = [];
    ids.set(key, list);
  }
  return list;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
