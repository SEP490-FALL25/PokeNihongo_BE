-- DropForeignKey
ALTER TABLE "Achievement" DROP CONSTRAINT "Achievement_rewardId_fkey";

-- DropForeignKey
ALTER TABLE "Lesson" DROP CONSTRAINT "Lesson_rewardId_fkey";

-- DropForeignKey
ALTER TABLE "UserRewardHistory" DROP CONSTRAINT "UserRewardHistory_rewardId_fkey";

-- AddForeignKey
ALTER TABLE "UserRewardHistory" ADD CONSTRAINT "UserRewardHistory_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
