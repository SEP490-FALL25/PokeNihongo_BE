/*
  Warnings:

  - You are about to drop the column `notes` on the `UserProgress` table. All the data in the column will be lost.
  - You are about to drop the column `score` on the `UserProgress` table. All the data in the column will be lost.
  - You are about to drop the column `timeSpent` on the `UserProgress` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "UserProgress" DROP COLUMN "notes",
DROP COLUMN "score",
DROP COLUMN "timeSpent";
