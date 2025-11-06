/*
  Warnings:

  - You are about to drop the `Rank` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Rank" DROP CONSTRAINT "Rank_seasonId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "levelJLPT" INTEGER;

-- DropTable
DROP TABLE "Rank";
