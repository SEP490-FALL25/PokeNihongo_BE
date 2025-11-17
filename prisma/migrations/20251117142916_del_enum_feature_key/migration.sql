/*
  Warnings:

  - The values [PERSONALIZATION] on the enum `FeatureKey` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "FeatureKey_new" AS ENUM ('UNLOCK_READING', 'UNLOCK_LISTENING', 'XP_MULTIPLIER', 'COIN_MULTIPLIER', 'UNLIMITED_TESTS', 'AI_KAIWA', 'PERSONALIZED_RECOMMENDATIONS');
ALTER TABLE "Feature" ALTER COLUMN "featureKey" TYPE "FeatureKey_new" USING ("featureKey"::text::"FeatureKey_new");
ALTER TYPE "FeatureKey" RENAME TO "FeatureKey_old";
ALTER TYPE "FeatureKey_new" RENAME TO "FeatureKey";
DROP TYPE "FeatureKey_old";
COMMIT;
