/*
  Warnings:

  - You are about to drop the column `createdById` on the `UserAchievement` table. All the data in the column will be lost.
  - You are about to drop the column `deletedById` on the `UserAchievement` table. All the data in the column will be lost.
  - You are about to drop the column `updatedById` on the `UserAchievement` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "UserAchievement" DROP CONSTRAINT "UserAchievement_createdById_fkey";

-- DropForeignKey
ALTER TABLE "UserAchievement" DROP CONSTRAINT "UserAchievement_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "UserAchievement" DROP CONSTRAINT "UserAchievement_updatedById_fkey";

-- AlterTable
ALTER TABLE "UserAchievement" DROP COLUMN "createdById",
DROP COLUMN "deletedById",
DROP COLUMN "updatedById";
