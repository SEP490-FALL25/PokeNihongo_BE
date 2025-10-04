/*
  Warnings:

  - You are about to drop the column `base_exp` on the `Pokemon` table. All the data in the column will be lost.
  - You are about to drop the column `condition_level` on the `Pokemon` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `Pokemon` table. All the data in the column will be lost.
  - You are about to drop the column `image_url` on the `Pokemon` table. All the data in the column will be lost.
  - You are about to drop the column `is_started` on the `Pokemon` table. All the data in the column will be lost.
  - You are about to drop the column `name_jp` on the `Pokemon` table. All the data in the column will be lost.
  - You are about to drop the column `name_translations` on the `Pokemon` table. All the data in the column will be lost.
  - You are about to drop the column `next_pokemon_id` on the `Pokemon` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `Pokemon` table. All the data in the column will be lost.
  - The `rarity` column on the `Pokemon` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `nameJp` to the `Pokemon` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nameTranslations` to the `Pokemon` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RarityPokemon" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- DropForeignKey
ALTER TABLE "Pokemon" DROP CONSTRAINT "Pokemon_next_pokemon_id_fkey";

-- AlterTable
ALTER TABLE "Pokemon" DROP COLUMN "base_exp",
DROP COLUMN "condition_level",
DROP COLUMN "created_at",
DROP COLUMN "image_url",
DROP COLUMN "is_started",
DROP COLUMN "name_jp",
DROP COLUMN "name_translations",
DROP COLUMN "next_pokemon_id",
DROP COLUMN "updated_at",
ADD COLUMN     "conditionLevel" INTEGER,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "isStarted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nameJp" TEXT NOT NULL,
ADD COLUMN     "nameTranslations" JSONB NOT NULL,
ADD COLUMN     "nextPokemonId" INTEGER,
DROP COLUMN "rarity",
ADD COLUMN     "rarity" "RarityPokemon" NOT NULL DEFAULT 'COMMON';

-- AddForeignKey
ALTER TABLE "Pokemon" ADD CONSTRAINT "Pokemon_nextPokemonId_fkey" FOREIGN KEY ("nextPokemonId") REFERENCES "Pokemon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
