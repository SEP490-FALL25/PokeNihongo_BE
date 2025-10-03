-- CreateEnum
CREATE TYPE "LevelType" AS ENUM ('USER', 'POKEMON');

-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('LESSON', 'DAILY_REQUEST', 'EVENT', 'ACHIEVEMENT', 'LEVEL');

-- CreateEnum
CREATE TYPE "RewardItem" AS ENUM ('ADD_EXP', 'ADD_POINT', 'GIVE_POKEMON', 'UNLOCK_FEATURE');

-- CreateEnum
CREATE TYPE "RewardTarget" AS ENUM ('EXP', 'POINT', 'POKEMON', 'BADGE', 'VOUCHER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "levelId" INTEGER;

-- CreateTable
CREATE TABLE "Reward" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "rewardType" "RewardType" NOT NULL DEFAULT 'LESSON',
    "rewardItem" "RewardItem" NOT NULL DEFAULT 'ADD_EXP',
    "rewardTarget" "RewardTarget" NOT NULL DEFAULT 'EXP',
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "deletedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Level" (
    "id" SERIAL NOT NULL,
    "levelNumber" INTEGER NOT NULL,
    "requiredExp" INTEGER NOT NULL,
    "levelType" "LevelType" NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "nextLevelId" INTEGER,
    "rewardId" INTEGER,
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "deletedById" INTEGER,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Level_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Level_deletedAt_idx" ON "Level"("deletedAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Reward" ADD CONSTRAINT "Reward_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Reward" ADD CONSTRAINT "Reward_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Reward" ADD CONSTRAINT "Reward_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Level" ADD CONSTRAINT "Level_nextLevelId_fkey" FOREIGN KEY ("nextLevelId") REFERENCES "Level"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Level" ADD CONSTRAINT "Level_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Level" ADD CONSTRAINT "Level_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Level" ADD CONSTRAINT "Level_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Level" ADD CONSTRAINT "Level_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
