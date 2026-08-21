/**
 * Re-runs the company extractor over stored articles:
 *
 *   npm run entities            # dry run - reports what would change
 *   npm run entities -- --apply # writes
 *
 * The sibling of `scripts/retag.ts`, and it exists for the same reason: the
 * dictionary in `lib/entities.ts` is applied once, at ingest, so a company
 * added to it today would otherwise be a company nobody had ever written
 * about. This is also the script that fills the column in the first place -
 * the migration adds it empty, and until this runs every company page is
 * correctly but uselessly blank.
 *
 * Unlike `retag`, this one is a **full recompute** rather than additive. The
 * difference is deliberate. Sector tags are cheap to gain and expensive to
 * lose, so retag only ever adds; a company tag is a claim that a named
 * business is in a story, and a bad match is precisely the thing that needs
 * to disappear when its alias is tightened. Narrowing an alias here and
 * re-running has to actually take the wrong rows off that company's page.
 *
 * Writes are grouped by the resulting entity set rather than issued per row.
 * The overwhelming majority of articles name nobody in the dictionary and so
 * share the empty set, which collapses tens of thousands of round trips into
 * a few hundred `updateMany` calls.
 */
import "dotenv/config";
import { db } from "../lib/db";
import { detectEntities, companyName } from "../lib/entities";

const APPLY = process.argv.includes("--apply");
/** Rows per read. Large enough to be few round trips, small enough to hold. */
const PAGE = 5000;

/** Ids per entity-set key. Kept beside the sets they belong to. */
const ids = new Map<string, string[]>();
function idsFor(key: string): string[] {
  let list = ids.get(key);
  if (!list) {
    list = [];
    ids.set(key, list);
  }
  return list;
}

function sameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, i) => value === b[i]);
}

async function main() {
  const total = await db.article.count();
  console.log(`${total.toLocaleString("en-IN")} articles. ${APPLY ? "APPLYING" : "Dry run"}.\n`);

  const byEntitySet = new Map<string, string[]>();
  const gained = new Map<string, number>();
  const lost = new Map<string, number>();
  let changed = 0;
  let scanned = 0;
  let cursor: string | undefined;

  for (;;) {
    const rows = await db.article.findMany({
      select: { id: true, title: true, excerpt: true, entities: true },
      orderBy: { id: "asc" },
      take: PAGE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (rows.length === 0) break;
    cursor = rows[rows.length - 1].id;
    scanned += rows.length;

    for (const row of rows) {
      // `detectEntities` returns dictionary order, and so does anything this
      // script has already written, so an ordered comparison is enough.
      const computed = detectEntities(row.title, row.excerpt);
      if (sameSet(computed, row.entities)) continue;

      changed++;
      for (const key of computed) {
        if (!row.entities.includes(key)) gained.set(key, (gained.get(key) ?? 0) + 1);
      }
      for (const key of row.entities) {
        if (!computed.includes(key)) lost.set(key, (lost.get(key) ?? 0) + 1);
      }

      const key = computed.join("|");
      if (!byEntitySet.has(key)) byEntitySet.set(key, computed);
      idsFor(key).push(row.id);
    }

    process.stdout.write(`  scanned ${scanned.toLocaleString("en-IN")}\r`);
  }

  console.log(`\n${changed.toLocaleString("en-IN")} articles would change.\n`);
  report("Stories gained", gained);
  if (lost.size > 0) report("Stories lost", lost);

  if (!APPLY) {
    console.log("\nNothing written. Re-run with --apply to write.");
    return;
  }

  console.log(`\nWriting in ${byEntitySet.size.toLocaleString("en-IN")} groups...`);
  let written = 0;
  for (const [key, entities] of byEntitySet) {
    const { count } = await db.article.updateMany({
      where: { id: { in: idsFor(key) } },
      data: { entities },
    });
    written += count;
  }
  console.log(`Updated ${written.toLocaleString("en-IN")} rows.`);
}

function report(heading: string, counts: Map<string, number>) {
  if (counts.size === 0) return;
  console.log(`${heading}:`);
  for (const [key, count] of [...counts].sort((a, b) => b[1] - a[1]).slice(0, 40)) {
    console.log(`  ${companyName(key).padEnd(34)} ${count.toLocaleString("en-IN")}`);
  }
  if (counts.size > 40) console.log(`  ... and ${counts.size - 40} more`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
