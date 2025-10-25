/*
  Warnings:

  - You are about to drop the column `name` on the `Reward` table. All the data in the column will be lost.
  - Added the required column `nameKey` to the `Reward` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Reward" DROP COLUMN "name",
ADD COLUMN     "nameKey" TEXT NOT NULL;
