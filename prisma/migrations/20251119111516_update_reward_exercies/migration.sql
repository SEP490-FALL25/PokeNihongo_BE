/*
  Warnings:

  - The `rewardId` column on the `Exercises` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- DropForeignKey
ALTER TABLE "Exercises" DROP CONSTRAINT "Exercises_rewardId_fkey";

-- AlterTable
ALTER TABLE "Exercises" DROP COLUMN "rewardId",
ADD COLUMN     "rewardId" INTEGER[];
