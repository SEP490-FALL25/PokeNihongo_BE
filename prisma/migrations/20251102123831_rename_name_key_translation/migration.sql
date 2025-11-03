/*
  Warnings:

  - You are about to drop the column `leaderboardSeasonId` on the `Translation` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Translation" DROP CONSTRAINT "Translation_leaderboardSeasonId_fkey";

-- AlterTable
ALTER TABLE "Translation" DROP COLUMN "leaderboardSeasonId",
ADD COLUMN     "leaderboardSeasonNameKey" TEXT;

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_leaderboardSeasonNameKey_fkey" FOREIGN KEY ("leaderboardSeasonNameKey") REFERENCES "LeaderboardSeason"("nameKey") ON DELETE CASCADE ON UPDATE CASCADE;
