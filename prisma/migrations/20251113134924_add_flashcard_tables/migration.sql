/*
  Warnings:

  - The values [FAIL] on the enum `TestAttemptStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "FlashcardDeckStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FlashcardDeckSource" AS ENUM ('SYSTEM', 'USER');

-- CreateEnum
CREATE TYPE "FlashcardCardStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FlashcardContentType" AS ENUM ('VOCABULARY', 'KANJI', 'GRAMMAR', 'CUSTOM');

-- CreateTable
CREATE TABLE "FlashcardDeck" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "status" "FlashcardDeckStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" "FlashcardDeckSource" NOT NULL DEFAULT 'USER',
    "jlptLevel" INTEGER,
    "coverImage" VARCHAR(1000),
    "metadata" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashcardDeck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashcardCard" (
    "id" SERIAL NOT NULL,
    "deckId" INTEGER NOT NULL,
    "contentType" "FlashcardContentType" NOT NULL,
    "vocabularyId" INTEGER,
    "kanjiId" INTEGER,
    "grammarId" INTEGER,
    "customFront" TEXT,
    "customBack" TEXT,
    "notes" TEXT,
    "imageUrl" VARCHAR(1000),
    "audioUrl" VARCHAR(1000),
    "status" "FlashcardCardStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashcardCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FlashcardDeck_userId_idx" ON "FlashcardDeck"("userId");

-- CreateIndex
CREATE INDEX "FlashcardDeck_status_idx" ON "FlashcardDeck"("status");

-- CreateIndex
CREATE INDEX "FlashcardCard_deckId_idx" ON "FlashcardCard"("deckId");

-- CreateIndex
CREATE INDEX "FlashcardCard_contentType_idx" ON "FlashcardCard"("contentType");

-- AddForeignKey
ALTER TABLE "FlashcardDeck" ADD CONSTRAINT "FlashcardDeck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardCard" ADD CONSTRAINT "FlashcardCard_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "FlashcardDeck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardCard" ADD CONSTRAINT "FlashcardCard_vocabularyId_fkey" FOREIGN KEY ("vocabularyId") REFERENCES "Vocabulary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardCard" ADD CONSTRAINT "FlashcardCard_kanjiId_fkey" FOREIGN KEY ("kanjiId") REFERENCES "Kanji"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardCard" ADD CONSTRAINT "FlashcardCard_grammarId_fkey" FOREIGN KEY ("grammarId") REFERENCES "Grammar"("id") ON DELETE SET NULL ON UPDATE CASCADE;
