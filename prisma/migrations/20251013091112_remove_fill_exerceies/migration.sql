/*
  Warnings:

  - You are about to drop the column `titleJp` on the `Exercises` table. All the data in the column will be lost.
  - You are about to drop the column `titleKey` on the `Exercises` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Exercises_titleKey_idx";

-- AlterTable
ALTER TABLE "Exercises" DROP COLUMN "titleJp",
DROP COLUMN "titleKey";
