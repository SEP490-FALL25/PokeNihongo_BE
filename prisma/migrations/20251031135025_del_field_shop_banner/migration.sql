/*
  Warnings:

  - You are about to drop the column `amount1Star` on the `ShopBanner` table. All the data in the column will be lost.
  - You are about to drop the column `amount2Star` on the `ShopBanner` table. All the data in the column will be lost.
  - You are about to drop the column `amount3Star` on the `ShopBanner` table. All the data in the column will be lost.
  - You are about to drop the column `amount4Star` on the `ShopBanner` table. All the data in the column will be lost.
  - You are about to drop the column `amount5Star` on the `ShopBanner` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ShopBanner" DROP COLUMN "amount1Star",
DROP COLUMN "amount2Star",
DROP COLUMN "amount3Star",
DROP COLUMN "amount4Star",
DROP COLUMN "amount5Star";
