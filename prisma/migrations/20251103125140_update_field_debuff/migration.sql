/*
  Warnings:

  - Made the column `typeDebuff` on table `DebuffRound` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "DebuffRound" ALTER COLUMN "typeDebuff" SET NOT NULL;
