/*
  Warnings:

  - The values [CHOOSE_STARTER_POKEMON,CAPTURE_POKEMON_COUNT,CAPTURE_TYPE_COLLECTION,CAPTURE_ALL_POKEMON,CAPTURE_LEGENDARY,EVOLVE_POKEMON_FINAL] on the enum `AchievementType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AchievementType_new" AS ENUM ('COMPLETE_LESSON', 'PLACEMENT_TEST_DONE', 'LEARNING_STREAK');
ALTER TABLE "Achievement" ALTER COLUMN "conditionType" TYPE "AchievementType_new" USING ("conditionType"::text::"AchievementType_new");
ALTER TYPE "AchievementType" RENAME TO "AchievementType_old";
ALTER TYPE "AchievementType_new" RENAME TO "AchievementType";
DROP TYPE "AchievementType_old";
COMMIT;
