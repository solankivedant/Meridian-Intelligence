-- CreateEnum
CREATE TYPE "Region" AS ENUM ('INDIA', 'WORLD');

-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "region" "Region" NOT NULL DEFAULT 'INDIA';

-- AlterTable
ALTER TABLE "Source" ADD COLUMN     "region" "Region" NOT NULL DEFAULT 'INDIA';

-- CreateIndex
CREATE INDEX "Article_region_publishedAt_idx" ON "Article"("region", "publishedAt");

-- CreateIndex
CREATE INDEX "Article_region_category_publishedAt_idx" ON "Article"("region", "category", "publishedAt");

-- Full-text search index. Prisma cannot express an expression index, so this
-- is hand-written: it backs the `websearch`-style query in lib/search.ts and
-- is what keeps a search across ~20k stories under a second.
CREATE INDEX "Article_search_idx"
  ON "Article"
  USING GIN (to_tsvector('english', "title" || ' ' || "excerpt"));

-- Sector filters use array containment (`tags && ARRAY[...]`), which needs a
-- GIN index to avoid a sequential scan once the archive is large.
CREATE INDEX "Article_tags_idx" ON "Article" USING GIN ("tags");
