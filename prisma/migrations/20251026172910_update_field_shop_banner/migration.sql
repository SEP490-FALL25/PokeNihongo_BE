/*
  Warnings:

  - You are about to drop the column `isActive` on the `ShopBanner` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "BannerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED', 'PREVIEW');

-- AlterTable
ALTER TABLE "ShopBanner" DROP COLUMN "isActive",
ADD COLUMN     "status" "BannerStatus" NOT NULL DEFAULT 'PREVIEW';
