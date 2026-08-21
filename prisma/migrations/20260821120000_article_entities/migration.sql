-- Companies named in a story, resolved at ingest against lib/entities.ts.
-- Existing rows start empty and are filled by `npm run entities -- --apply`,
-- the same way a newly-added sector tag is backfilled by `npm run retag`.
-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "entities" TEXT[];

-- Company filters use array containment (`entities && ARRAY[...]`), which
-- needs a GIN index to avoid a sequential scan - see Article_tags_idx.
-- CreateIndex
CREATE INDEX "Article_entities_idx" ON "Article" USING GIN ("entities");
