/*
  Warnings:

  - You are about to drop the column `levelId` on the `UserPokemon` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "UserPokemon" DROP CONSTRAINT "UserPokemon_levelId_fkey";

-- AlterTable
ALTER TABLE "UserPokemon" DROP COLUMN "levelId";
