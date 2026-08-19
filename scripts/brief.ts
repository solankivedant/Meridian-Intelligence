/**
 * Regenerates the day's wrap:  npm run brief
 *
 * Same work as `/api/cron/brief`, but off the HTTP path - the companion to
 * `scripts/ingest.ts`. Having both as scripts is what lets one scheduler run
 * the whole pipeline in order (fetch the stories, then summarise them) without
 * a deployed URL, a shared secret, or a serverless time limit in the way.
 */
import "dotenv/config";
import { briefSummaryOf, generateDailyBrief } from "../lib/brief";

async function main() {
  const brief = await generateDailyBrief();

  const highlights = (brief.highlights ?? {}) as Record<string, unknown[]>;
  const counted = Object.entries(highlights)
    .map(([category, items]) => `${category}=${items.length}`)
    .join("  ");

  console.log(`Brief for ${brief.date.toISOString().slice(0, 10)}`);
  console.log(`  highlights: ${counted || "none"}`);

  // The summary is the one part that can fail on its own - Gemini may be
  // unconfigured or rate-limited, and the brief deliberately keeps the previous
  // day's text rather than blanking the wrap. Say which happened.
  const summary = briefSummaryOf(brief.summary);
  console.log(
    summary
      ? `  summary: ${summary.points.length} points, ${summary.overview.length} chars of overview`
      : "  summary: none written (Gemini unconfigured or unavailable)"
  );
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
