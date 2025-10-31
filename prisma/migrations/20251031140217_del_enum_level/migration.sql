/*
  Warnings:

  - The values [POKEMON] on the enum `LevelType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "LevelType_new" AS ENUM ('USER');
ALTER TABLE "Level" ALTER COLUMN "levelType" TYPE "LevelType_new" USING ("levelType"::text::"LevelType_new");
ALTER TYPE "LevelType" RENAME TO "LevelType_old";
ALTER TYPE "LevelType_new" RENAME TO "LevelType";
DROP TYPE "LevelType_old";
COMMIT;

-- AlterTable
ALTER TABLE "Level" ALTER COLUMN "levelType" SET DEFAULT 'USER';
