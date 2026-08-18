/**
 * One-off historical crawl:  npm run backfill -- --months=18
 *
 * A full 18-month crawl issues ~150 requests and takes several minutes, which
 * is well past any serverless timeout — that's why this runs locally rather
 * than behind the cron route. Re-running is safe: articles dedupe on URL and
 * on normalized headline.
 */
import "dotenv/config";
import { Region } from "@prisma/client";
import { runBackfill } from "../lib/ingestion/backfill";

function intArg(name: string, fallback: number): number {
  const raw = process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function regionArg(): Region | undefined {
  const raw = process.argv.find((a) => a.startsWith("--region="))?.split("=")[1];
  if (!raw) return undefined;
  return raw.toUpperCase() === "WORLD" ? Region.WORLD : Region.INDIA;
}

function listArg(name: string): string[] | undefined {
  const raw = process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
  return raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
}

async function main() {
  const monthsBack = intArg("months", 18);
  const queryKeys = listArg("queries");
  const region = regionArg();

  console.log(
    `Backfilling ${monthsBack + 1} month(s) of history` +
      `${region ? ` for the ${region} desk` : ""}…`
  );

  const totals = { fetched: 0, created: 0, skipped: 0, duplicate: 0, errors: 0 };

  await runBackfill({
    monthsBack,
    queryKeys,
    region,
    onProgress: (r) => {
      if (r.error) {
        totals.errors++;
        console.log(`  ${r.month}  ${r.desk}  ${r.query.padEnd(12)}  ERROR  ${r.error}`);
        return;
      }
      totals.fetched += r.fetched;
      totals.created += r.created;
      totals.skipped += r.skipped;
      totals.duplicate += r.duplicate;
      console.log(
        `  ${r.month}  ${r.desk}  ${r.query.padEnd(12)}  fetched ${String(r.fetched).padStart(3)}  ` +
          `new ${String(r.created).padStart(3)}  dup ${String(r.duplicate).padStart(3)}  ` +
          `off-topic ${String(r.skipped).padStart(3)}`
      );
    },
  });

  console.log("\nDone.", totals);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { db } = await import("../lib/db");
    await db.$disconnect();
  });
