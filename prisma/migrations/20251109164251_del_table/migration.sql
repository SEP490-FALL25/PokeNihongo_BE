/*
  Warnings:

  - You are about to drop the `UserRewardHistory` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "UserRewardHistory" DROP CONSTRAINT "UserRewardHistory_rewardId_fkey";

-- DropForeignKey
ALTER TABLE "UserRewardHistory" DROP CONSTRAINT "UserRewardHistory_userId_fkey";

-- DropTable
DROP TABLE "UserRewardHistory";
