-- AlterTable
ALTER TABLE "Vocabulary" ADD COLUMN     "levelN" INTEGER,
ADD COLUMN     "wordTypeId" INTEGER;

-- CreateTable
CREATE TABLE "WordType" (
    "id" SERIAL NOT NULL,
    "nameKey" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WordType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kanji" (
    "id" SERIAL NOT NULL,
    "character" VARCHAR(10) NOT NULL,
    "meaningKey" VARCHAR(200) NOT NULL,
    "onyomi" VARCHAR(100),
    "kunyomi" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kanji_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meaning" (
    "id" SERIAL NOT NULL,
    "vocabularyId" INTEGER NOT NULL,
    "languageCode" VARCHAR(10) NOT NULL,
    "meaningText" VARCHAR(1000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meaning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vocabulary_Kanji" (
    "vocabularyId" INTEGER NOT NULL,
    "kanjiId" INTEGER NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vocabulary_Kanji_pkey" PRIMARY KEY ("vocabularyId","kanjiId")
);

-- CreateIndex
CREATE UNIQUE INDEX "WordType_nameKey_key" ON "WordType"("nameKey");

-- CreateIndex
CREATE INDEX "WordType_nameKey_idx" ON "WordType"("nameKey");

-- CreateIndex
CREATE UNIQUE INDEX "Kanji_character_key" ON "Kanji"("character");

-- CreateIndex
CREATE INDEX "Kanji_character_idx" ON "Kanji"("character");

-- CreateIndex
CREATE INDEX "Kanji_meaningKey_idx" ON "Kanji"("meaningKey");

-- CreateIndex
CREATE INDEX "Meaning_vocabularyId_idx" ON "Meaning"("vocabularyId");

-- CreateIndex
CREATE INDEX "Meaning_languageCode_idx" ON "Meaning"("languageCode");

-- CreateIndex
CREATE INDEX "Vocabulary_Kanji_vocabularyId_idx" ON "Vocabulary_Kanji"("vocabularyId");

-- CreateIndex
CREATE INDEX "Vocabulary_Kanji_kanjiId_idx" ON "Vocabulary_Kanji"("kanjiId");

-- CreateIndex
CREATE INDEX "Vocabulary_levelN_idx" ON "Vocabulary"("levelN");

-- CreateIndex
CREATE INDEX "Vocabulary_wordTypeId_idx" ON "Vocabulary"("wordTypeId");

-- AddForeignKey
ALTER TABLE "Meaning" ADD CONSTRAINT "Meaning_vocabularyId_fkey" FOREIGN KEY ("vocabularyId") REFERENCES "Vocabulary"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Vocabulary_Kanji" ADD CONSTRAINT "Vocabulary_Kanji_vocabularyId_fkey" FOREIGN KEY ("vocabularyId") REFERENCES "Vocabulary"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Vocabulary_Kanji" ADD CONSTRAINT "Vocabulary_Kanji_kanjiId_fkey" FOREIGN KEY ("kanjiId") REFERENCES "Kanji"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Vocabulary" ADD CONSTRAINT "Vocabulary_wordTypeId_fkey" FOREIGN KEY ("wordTypeId") REFERENCES "WordType"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
