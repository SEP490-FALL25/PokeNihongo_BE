-- DropIndex
DROP INDEX "Translation_languageCode_idx";

-- DropIndex  
DROP INDEX "Translation_languageCode_key_key";

-- AlterTable Translation: Change languageCode to languageId
-- Step 1: Add new languageId column
ALTER TABLE "Translation" ADD COLUMN "languageId" INTEGER;

-- Step 2: Migrate data from languageCode to languageId
-- Map languageCode to languageId based on Languages table
UPDATE "Translation" t
SET "languageId" = l.id
FROM "Languages" l
WHERE t."languageCode" = l.code;

-- Step 3: Drop old languageCode column
ALTER TABLE "Translation" DROP COLUMN "languageCode";

-- Step 4: Make languageId NOT NULL
ALTER TABLE "Translation" ALTER COLUMN "languageId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Translation_languageId_idx" ON "Translation"("languageId");

-- CreateIndex
CREATE UNIQUE INDEX "Translation_languageId_key_key" ON "Translation"("languageId", "key");

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Languages"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

