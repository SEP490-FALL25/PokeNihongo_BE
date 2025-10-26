/*
  Warnings:

  - You are about to drop the column `purChasedCount` on the `ShopItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ShopItem" DROP COLUMN "purChasedCount",
ADD COLUMN     "purchasedCount" INTEGER NOT NULL DEFAULT 0;
