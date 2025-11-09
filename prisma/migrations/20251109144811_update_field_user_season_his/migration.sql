/*
  Warnings:

  - The `rewardsClaimed` column on the `UserSeasonHistory` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "RewardClaimStatus" AS ENUM ('PENDING', 'CLAIMED', 'COMPLETED');

-- AlterTable
ALTER TABLE "UserSeasonHistory" DROP COLUMN "rewardsClaimed",
ADD COLUMN     "rewardsClaimed" "RewardClaimStatus" NOT NULL DEFAULT 'PENDING';
