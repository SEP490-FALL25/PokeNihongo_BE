/*
  Warnings:

  - The `rewardId` column on the `Lesson` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- DropForeignKey
ALTER TABLE "Lesson" DROP CONSTRAINT "Lesson_rewardId_fkey";

-- AlterTable
ALTER TABLE "Lesson" DROP COLUMN "rewardId",
ADD COLUMN     "rewardId" INTEGER[];
