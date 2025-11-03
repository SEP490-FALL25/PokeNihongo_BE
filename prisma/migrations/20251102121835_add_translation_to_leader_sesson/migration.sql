/*
  Warnings:

  - You are about to drop the column `name` on the `LeaderboardSeason` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[nameKey]` on the table `LeaderboardSeason` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `nameKey` to the `LeaderboardSeason` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LeaderboardSeason" DROP COLUMN "name",
ADD COLUMN     "nameKey" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Translation" ADD COLUMN     "leaderboardSeasonId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardSeason_nameKey_key" ON "LeaderboardSeason"("nameKey");

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_leaderboardSeasonId_fkey" FOREIGN KEY ("leaderboardSeasonId") REFERENCES "LeaderboardSeason"("nameKey") ON DELETE CASCADE ON UPDATE CASCADE;
