/*
  Warnings:

  - You are about to drop the column `createdById` on the `GachaRollHistory` table. All the data in the column will be lost.
  - You are about to drop the column `deletedById` on the `GachaRollHistory` table. All the data in the column will be lost.
  - You are about to drop the column `updatedById` on the `GachaRollHistory` table. All the data in the column will be lost.
  - You are about to drop the column `userGachaPityId` on the `GachaRollHistory` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "GachaRollHistory" DROP CONSTRAINT "GachaRollHistory_createdById_fkey";

-- DropForeignKey
ALTER TABLE "GachaRollHistory" DROP CONSTRAINT "GachaRollHistory_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "GachaRollHistory" DROP CONSTRAINT "GachaRollHistory_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "GachaRollHistory" DROP CONSTRAINT "GachaRollHistory_userGachaPityId_fkey";

-- AlterTable
ALTER TABLE "GachaRollHistory" DROP COLUMN "createdById",
DROP COLUMN "deletedById",
DROP COLUMN "updatedById",
DROP COLUMN "userGachaPityId";

-- AddForeignKey
ALTER TABLE "GachaRollHistory" ADD CONSTRAINT "GachaRollHistory_pityId_fkey" FOREIGN KEY ("pityId") REFERENCES "UserGachaPity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
