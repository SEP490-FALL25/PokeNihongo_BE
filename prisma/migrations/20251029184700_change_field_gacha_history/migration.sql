/*
  Warnings:

  - You are about to drop the column `pityId` on the `GachaPurchase` table. All the data in the column will be lost.
  - You are about to drop the column `isPity` on the `GachaRollHistory` table. All the data in the column will be lost.
  - Added the required column `pityCountAfter` to the `GachaRollHistory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pityCountBefore` to the `GachaRollHistory` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "GachaPurchase" DROP CONSTRAINT "GachaPurchase_pityId_fkey";

-- AlterTable
ALTER TABLE "GachaPurchase" DROP COLUMN "pityId",
ADD COLUMN     "userGachaPityId" INTEGER;

-- AlterTable
ALTER TABLE "GachaRollHistory" DROP COLUMN "isPity",
ADD COLUMN     "pityCountAfter" INTEGER NOT NULL,
ADD COLUMN     "pityCountBefore" INTEGER NOT NULL,
ADD COLUMN     "pityId" INTEGER;

-- AddForeignKey
ALTER TABLE "GachaPurchase" ADD CONSTRAINT "GachaPurchase_userGachaPityId_fkey" FOREIGN KEY ("userGachaPityId") REFERENCES "UserGachaPity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GachaRollHistory" ADD CONSTRAINT "GachaRollHistory_pityId_fkey" FOREIGN KEY ("pityId") REFERENCES "UserGachaPity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
