/*
  Warnings:

  - You are about to drop the column `coverImage` on the `FlashcardDeck` table. All the data in the column will be lost.
  - You are about to drop the column `jlptLevel` on the `FlashcardDeck` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FlashcardDeck" DROP COLUMN "coverImage",
DROP COLUMN "jlptLevel";
