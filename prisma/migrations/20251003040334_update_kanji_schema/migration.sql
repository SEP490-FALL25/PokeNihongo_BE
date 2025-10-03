/*
  Warnings:

  - You are about to drop the column `kunyomi` on the `Kanji` table. All the data in the column will be lost.
  - You are about to drop the column `onyomi` on the `Kanji` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Kanji" DROP COLUMN "kunyomi",
DROP COLUMN "onyomi",
ADD COLUMN     "jlptLevel" INTEGER,
ADD COLUMN     "strokeCount" INTEGER;

-- CreateTable
CREATE TABLE "Kanji_Reading" (
    "id" SERIAL NOT NULL,
    "kanjiId" INTEGER NOT NULL,
    "readingType" VARCHAR(20) NOT NULL,
    "reading" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kanji_Reading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Kanji_Reading_kanjiId_idx" ON "Kanji_Reading"("kanjiId");

-- CreateIndex
CREATE INDEX "Kanji_Reading_readingType_idx" ON "Kanji_Reading"("readingType");

-- CreateIndex
CREATE INDEX "Kanji_Reading_reading_idx" ON "Kanji_Reading"("reading");

-- CreateIndex
CREATE INDEX "Kanji_jlptLevel_idx" ON "Kanji"("jlptLevel");

-- AddForeignKey
ALTER TABLE "Kanji_Reading" ADD CONSTRAINT "Kanji_Reading_kanjiId_fkey" FOREIGN KEY ("kanjiId") REFERENCES "Kanji"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
