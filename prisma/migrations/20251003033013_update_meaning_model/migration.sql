/*
  Warnings:

  - You are about to drop the column `languageCode` on the `Meaning` table. All the data in the column will be lost.
  - You are about to drop the column `meaningText` on the `Meaning` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Meaning_languageCode_idx";

-- AlterTable
ALTER TABLE "Meaning" DROP COLUMN "languageCode",
DROP COLUMN "meaningText",
ADD COLUMN     "exampleSentenceJp" VARCHAR(1000),
ADD COLUMN     "exampleSentenceKey" VARCHAR(500),
ADD COLUMN     "explanationKey" VARCHAR(500),
ADD COLUMN     "meaningKey" VARCHAR(500),
ADD COLUMN     "wordTypeId" INTEGER;

-- AlterTable
ALTER TABLE "WordType" ADD COLUMN     "tag" VARCHAR(50);

-- CreateIndex
CREATE INDEX "Meaning_wordTypeId_idx" ON "Meaning"("wordTypeId");

-- CreateIndex
CREATE INDEX "Meaning_meaningKey_idx" ON "Meaning"("meaningKey");

-- CreateIndex
CREATE INDEX "Meaning_exampleSentenceKey_idx" ON "Meaning"("exampleSentenceKey");

-- CreateIndex
CREATE INDEX "Meaning_explanationKey_idx" ON "Meaning"("explanationKey");

-- CreateIndex
CREATE INDEX "WordType_tag_idx" ON "WordType"("tag");

-- AddForeignKey
ALTER TABLE "Meaning" ADD CONSTRAINT "Meaning_wordTypeId_fkey" FOREIGN KEY ("wordTypeId") REFERENCES "WordType"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
