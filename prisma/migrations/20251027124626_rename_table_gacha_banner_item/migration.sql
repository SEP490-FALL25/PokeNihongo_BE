/*
  Warnings:

  - You are about to drop the `GachaBannerItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "GachaBannerItem" DROP CONSTRAINT "GachaBannerItem_bannerId_fkey";

-- DropForeignKey
ALTER TABLE "GachaBannerItem" DROP CONSTRAINT "GachaBannerItem_createdById_fkey";

-- DropForeignKey
ALTER TABLE "GachaBannerItem" DROP CONSTRAINT "GachaBannerItem_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "GachaBannerItem" DROP CONSTRAINT "GachaBannerItem_gachaItemRateId_fkey";

-- DropForeignKey
ALTER TABLE "GachaBannerItem" DROP CONSTRAINT "GachaBannerItem_pokemonId_fkey";

-- DropForeignKey
ALTER TABLE "GachaBannerItem" DROP CONSTRAINT "GachaBannerItem_updatedById_fkey";

-- DropTable
DROP TABLE "GachaBannerItem";

-- CreateTable
CREATE TABLE "GachaItem" (
    "id" SERIAL NOT NULL,
    "bannerId" INTEGER NOT NULL,
    "pokemonId" INTEGER NOT NULL,
    "gachaItemRateId" INTEGER NOT NULL,
    "createdById" INTEGER,
    "deletedById" INTEGER,
    "updatedById" INTEGER,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GachaItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GachaItem_bannerId_pokemonId_key" ON "GachaItem"("bannerId", "pokemonId");

-- AddForeignKey
ALTER TABLE "GachaItem" ADD CONSTRAINT "GachaItem_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "GachaBanner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GachaItem" ADD CONSTRAINT "GachaItem_pokemonId_fkey" FOREIGN KEY ("pokemonId") REFERENCES "Pokemon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GachaItem" ADD CONSTRAINT "GachaItem_gachaItemRateId_fkey" FOREIGN KEY ("gachaItemRateId") REFERENCES "GachaItemRate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GachaItem" ADD CONSTRAINT "GachaItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "GachaItem" ADD CONSTRAINT "GachaItem_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "GachaItem" ADD CONSTRAINT "GachaItem_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
