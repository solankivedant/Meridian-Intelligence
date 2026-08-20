export function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="py-12 text-center">
      <p className="headline text-[20px] text-[var(--text-primary)]">
        {filtered ? "Nothing filed under these filters" : "The archive is empty"}
      </p>
      <p className="measure mx-auto mt-2 text-[14px] leading-relaxed text-[var(--text-secondary)]">
        {filtered ? (
          "Try a wider time range, a different month, or clear the sector and publisher filters."
        ) : (
          <>
            Run <code className="meta">npm run backfill</code> to crawl the news
            archive, then trigger <code className="meta">/api/cron/ingest</code>{" "}
            to start pulling live feeds.
          </>
        )}
      </p>
    </div>
  );
}
