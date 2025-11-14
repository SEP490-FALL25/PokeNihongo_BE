/*
  Warnings:

  - You are about to drop the column `audioUrl` on the `FlashcardCard` table. All the data in the column will be lost.
  - You are about to drop the column `customBack` on the `FlashcardCard` table. All the data in the column will be lost.
  - You are about to drop the column `customFront` on the `FlashcardCard` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `FlashcardCard` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `FlashcardCard` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FlashcardCard" DROP COLUMN "audioUrl",
DROP COLUMN "customBack",
DROP COLUMN "customFront",
DROP COLUMN "imageUrl",
DROP COLUMN "metadata";
