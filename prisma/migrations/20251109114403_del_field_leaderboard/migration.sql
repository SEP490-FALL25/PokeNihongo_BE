/*
  Warnings:

  - You are about to drop the column `isActive` on the `LeaderboardSeason` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "LeaderboardSeason_isActive_idx";

-- AlterTable
ALTER TABLE "LeaderboardSeason" DROP COLUMN "isActive";

-- CreateIndex
CREATE INDEX "LeaderboardSeason_startDate_idx" ON "LeaderboardSeason"("startDate");

-- CreateIndex
CREATE INDEX "LeaderboardSeason_endDate_idx" ON "LeaderboardSeason"("endDate");

-- CreateIndex
CREATE INDEX "LeaderboardSeason_status_idx" ON "LeaderboardSeason"("status");
