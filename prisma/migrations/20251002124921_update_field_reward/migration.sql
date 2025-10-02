/*
  Warnings:

  - Changed the type of `rewardItem` on the `Reward` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Reward" DROP COLUMN "rewardItem",
ADD COLUMN     "rewardItem" INTEGER NOT NULL;

-- DropEnum
DROP TYPE "RewardItem";
