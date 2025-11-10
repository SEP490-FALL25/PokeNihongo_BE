-- CreateEnum
CREATE TYPE "UserRewardSourceType" AS ENUM ('REWARD_SERVICE', 'LESSON', 'DAILY_REQUEST', 'ATTENDANCE', 'SEASON_REWARD', 'ADMIN_ADJUST', 'OTHER');

-- CreateTable
CREATE TABLE "UserRewardHistory" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "rewardId" INTEGER,
    "rewardTargetSnapshot" "RewardTarget",
    "amount" INTEGER,
    "sourceType" "UserRewardSourceType" NOT NULL,
    "sourceId" INTEGER,
    "note" VARCHAR(1000),
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRewardHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserRewardHistory_userId_idx" ON "UserRewardHistory"("userId");

-- CreateIndex
CREATE INDEX "UserRewardHistory_rewardId_idx" ON "UserRewardHistory"("rewardId");

-- CreateIndex
CREATE INDEX "UserRewardHistory_sourceType_idx" ON "UserRewardHistory"("sourceType");

-- AddForeignKey
ALTER TABLE "UserRewardHistory" ADD CONSTRAINT "UserRewardHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "UserRewardHistory" ADD CONSTRAINT "UserRewardHistory_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
