/*
  Warnings:

  - You are about to drop the column `name` on the `GachaBanner` table. All the data in the column will be lost.
  - Added the required column `nameKey` to the `GachaBanner` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "GachaBanner" DROP COLUMN "name",
ADD COLUMN     "nameKey" VARCHAR(200) NOT NULL;
