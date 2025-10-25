/*
  Warnings:

  - A unique constraint covering the columns `[nameKey]` on the table `Reward` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Translation" ADD COLUMN     "rewardNameKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Reward_nameKey_key" ON "Reward"("nameKey");

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_rewardNameKey_fkey" FOREIGN KEY ("rewardNameKey") REFERENCES "Reward"("nameKey") ON DELETE CASCADE ON UPDATE CASCADE;
