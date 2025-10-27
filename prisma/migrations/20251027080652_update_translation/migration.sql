/*
  Warnings:

  - A unique constraint covering the columns `[nameKey]` on the table `GachaBanner` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "GachaBanner" ALTER COLUMN "nameKey" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Translation" ADD COLUMN     "gachaBannerNameKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "GachaBanner_nameKey_key" ON "GachaBanner"("nameKey");

-- CreateIndex
CREATE INDEX "GachaPurchase_userId_idx" ON "GachaPurchase"("userId");

-- CreateIndex
CREATE INDEX "GachaPurchase_bannerId_idx" ON "GachaPurchase"("bannerId");

-- CreateIndex
CREATE INDEX "GachaPurchase_walletTransId_idx" ON "GachaPurchase"("walletTransId");

-- CreateIndex
CREATE INDEX "GachaRollHistory_purchaseId_idx" ON "GachaRollHistory"("purchaseId");

-- CreateIndex
CREATE INDEX "GachaRollHistory_userId_idx" ON "GachaRollHistory"("userId");

-- CreateIndex
CREATE INDEX "GachaRollHistory_bannerId_idx" ON "GachaRollHistory"("bannerId");

-- CreateIndex
CREATE INDEX "UserGachaPity_userId_idx" ON "UserGachaPity"("userId");

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_gachaBannerNameKey_fkey" FOREIGN KEY ("gachaBannerNameKey") REFERENCES "GachaBanner"("nameKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGachaPity" ADD CONSTRAINT "UserGachaPity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
