-- AlterTable
ALTER TABLE "GachaBanner" ADD COLUMN     "enablePrecreate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "precreateBeforeEndDays" INTEGER NOT NULL DEFAULT 2;

-- AlterTable
ALTER TABLE "ShopBanner" ADD COLUMN     "enablePrecreate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "precreateBeforeEndDays" INTEGER NOT NULL DEFAULT 2;
