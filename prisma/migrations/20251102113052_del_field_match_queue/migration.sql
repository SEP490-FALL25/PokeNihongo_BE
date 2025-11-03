/*
  Warnings:

  - You are about to drop the column `selectedPokemon1Id` on the `MatchQueue` table. All the data in the column will be lost.
  - You are about to drop the column `selectedPokemon2Id` on the `MatchQueue` table. All the data in the column will be lost.
  - You are about to drop the column `selectedPokemon3Id` on the `MatchQueue` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "MatchQueue" DROP CONSTRAINT "MatchQueue_selectedPokemon1Id_fkey";

-- DropForeignKey
ALTER TABLE "MatchQueue" DROP CONSTRAINT "MatchQueue_selectedPokemon2Id_fkey";

-- DropForeignKey
ALTER TABLE "MatchQueue" DROP CONSTRAINT "MatchQueue_selectedPokemon3Id_fkey";

-- AlterTable
ALTER TABLE "MatchQueue" DROP COLUMN "selectedPokemon1Id",
DROP COLUMN "selectedPokemon2Id",
DROP COLUMN "selectedPokemon3Id";
