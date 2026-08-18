/**
 * Pulls every configured feed once:  npm run ingest
 *
 * Same work as `/api/cron/ingest`, but off the HTTP path. Seventy-plus feeds
 * take longer than a serverless function is allowed to run, so the route is
 * for scheduled top-ups and this is for a full sweep from a laptop.
 */
import "dotenv/config";
import { runIngestion } from "../lib/ingestion/run";

async function main() {
  const summaries = await runIngestion();

  const totals = { fetched: 0, created: 0, skipped: 0, duplicate: 0 };
  const failures: string[] = [];

  for (const s of summaries) {
    if (s.error) {
      failures.push(`${s.source}: ${s.error}`);
      continue;
    }
    totals.fetched += s.fetched;
    totals.created += s.created;
    totals.skipped += s.skipped ?? 0;
    totals.duplicate += s.duplicate ?? 0;
    console.log(
      `  ${s.source.padEnd(44)} fetched ${String(s.fetched).padStart(4)}` +
        `  new ${String(s.created).padStart(4)}`
    );
  }

  console.log(`\n${summaries.length - failures.length}/${summaries.length} sources ok.`);
  console.log("Totals:", totals);
  if (failures.length > 0) {
    console.log("\nFailed:");
    for (const failure of failures) console.log(`  ${failure}`);
  }
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
