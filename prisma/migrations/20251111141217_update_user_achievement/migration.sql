/*
  Warnings:

  - You are about to drop the column `isRewardClaimed` on the `UserAchievement` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "UserAchievementStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED_NOT_CLAIMED', 'CLAIMED');

-- AlterTable
ALTER TABLE "UserAchievement" DROP COLUMN "isRewardClaimed",
ADD COLUMN     "status" "UserAchievementStatus" NOT NULL DEFAULT 'IN_PROGRESS';
