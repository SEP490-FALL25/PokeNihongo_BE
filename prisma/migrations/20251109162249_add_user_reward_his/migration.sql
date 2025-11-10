-- CreateTable
CREATE TABLE "UserRewardHistory" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "rewardId" INTEGER NOT NULL,
    "sourceId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "UserRewardHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserRewardHistory_userId_idx" ON "UserRewardHistory"("userId");

-- CreateIndex
CREATE INDEX "UserRewardHistory_rewardId_idx" ON "UserRewardHistory"("rewardId");

-- AddForeignKey
ALTER TABLE "UserRewardHistory" ADD CONSTRAINT "UserRewardHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRewardHistory" ADD CONSTRAINT "UserRewardHistory_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE CASCADE ON UPDATE CASCADE;
