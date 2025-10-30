/*
  Warnings:

  - You are about to drop the column `pityCountAfter` on the `GachaRollHistory` table. All the data in the column will be lost.
  - You are about to drop the column `pityCountBefore` on the `GachaRollHistory` table. All the data in the column will be lost.
  - Added the required column `pityNow` to the `GachaRollHistory` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "GachaRollHistory" DROP CONSTRAINT "GachaRollHistory_pityId_fkey";

-- AlterTable
ALTER TABLE "GachaRollHistory" DROP COLUMN "pityCountAfter",
DROP COLUMN "pityCountBefore",
ADD COLUMN     "pityNow" INTEGER NOT NULL,
ADD COLUMN     "pityStatus" "GachaPityType" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "userGachaPityId" INTEGER;

-- AddForeignKey
ALTER TABLE "GachaRollHistory" ADD CONSTRAINT "GachaRollHistory_userGachaPityId_fkey" FOREIGN KEY ("userGachaPityId") REFERENCES "UserGachaPity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
