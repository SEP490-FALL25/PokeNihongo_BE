-- CreateEnum
CREATE TYPE "RankName" AS ENUM ('N5', 'N4', 'N3');

-- AlterTable
ALTER TABLE "UserSeasonHistory" ADD COLUMN     "rewardsClaimed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "seasonRankRewardId" INTEGER;

-- CreateTable
CREATE TABLE "SeasonRankReward" (
    "id" SERIAL NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "rankName" "RankName" NOT NULL DEFAULT 'N5',
    "order" INTEGER NOT NULL,
    "createdById" INTEGER,
    "deletedById" INTEGER,
    "updatedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SeasonRankReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_RewardToSeasonRankReward" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_RewardToSeasonRankReward_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "SeasonRankReward_seasonId_idx" ON "SeasonRankReward"("seasonId");

-- CreateIndex
CREATE INDEX "SeasonRankReward_rankName_idx" ON "SeasonRankReward"("rankName");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonRankReward_seasonId_rankName_order_key" ON "SeasonRankReward"("seasonId", "rankName", "order");

-- CreateIndex
CREATE INDEX "_RewardToSeasonRankReward_B_index" ON "_RewardToSeasonRankReward"("B");

-- CreateIndex
CREATE INDEX "UserSeasonHistory_userId_idx" ON "UserSeasonHistory"("userId");

-- AddForeignKey
ALTER TABLE "UserSeasonHistory" ADD CONSTRAINT "UserSeasonHistory_seasonRankRewardId_fkey" FOREIGN KEY ("seasonRankRewardId") REFERENCES "SeasonRankReward"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonRankReward" ADD CONSTRAINT "SeasonRankReward_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "LeaderboardSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonRankReward" ADD CONSTRAINT "SeasonRankReward_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SeasonRankReward" ADD CONSTRAINT "SeasonRankReward_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SeasonRankReward" ADD CONSTRAINT "SeasonRankReward_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "_RewardToSeasonRankReward" ADD CONSTRAINT "_RewardToSeasonRankReward_A_fkey" FOREIGN KEY ("A") REFERENCES "Reward"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RewardToSeasonRankReward" ADD CONSTRAINT "_RewardToSeasonRankReward_B_fkey" FOREIGN KEY ("B") REFERENCES "SeasonRankReward"("id") ON DELETE CASCADE ON UPDATE CASCADE;
