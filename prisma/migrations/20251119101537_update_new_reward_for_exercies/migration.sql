-- AlterTable
ALTER TABLE "Exercises" ADD COLUMN     "rewardId" INTEGER;

-- AddForeignKey
ALTER TABLE "Exercises" ADD CONSTRAINT "Exercises_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
