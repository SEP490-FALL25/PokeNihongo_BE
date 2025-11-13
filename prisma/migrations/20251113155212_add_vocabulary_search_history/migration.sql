/*
  Warnings:

  - The values [FAIL] on the enum `TestAttemptStatus` will be removed. If these variants are still used in the database, this will fail.

*/

-- CreateTable
CREATE TABLE "VocabularySearchHistory" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "vocabularyId" INTEGER,
    "searchKeyword" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VocabularySearchHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VocabularySearchHistory_userId_idx" ON "VocabularySearchHistory"("userId");

-- CreateIndex
CREATE INDEX "VocabularySearchHistory_vocabularyId_idx" ON "VocabularySearchHistory"("vocabularyId");

-- CreateIndex
CREATE INDEX "VocabularySearchHistory_createdAt_idx" ON "VocabularySearchHistory"("createdAt");

-- CreateIndex
CREATE INDEX "VocabularySearchHistory_searchKeyword_idx" ON "VocabularySearchHistory"("searchKeyword");

-- AddForeignKey
ALTER TABLE "VocabularySearchHistory" ADD CONSTRAINT "VocabularySearchHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularySearchHistory" ADD CONSTRAINT "VocabularySearchHistory_vocabularyId_fkey" FOREIGN KEY ("vocabularyId") REFERENCES "Vocabulary"("id") ON DELETE SET NULL ON UPDATE CASCADE;
