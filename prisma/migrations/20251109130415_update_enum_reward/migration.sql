/*
  Warnings:

  - The values [POINT,BADGE,VOUCHER] on the enum `RewardTarget` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RewardTarget_new" AS ENUM ('EXP', 'POKEMON', 'POKE_COINS', 'SPARKLES');
ALTER TABLE "Reward" ALTER COLUMN "rewardTarget" DROP DEFAULT;
ALTER TABLE "Reward" ALTER COLUMN "rewardTarget" TYPE "RewardTarget_new" USING ("rewardTarget"::text::"RewardTarget_new");
ALTER TYPE "RewardTarget" RENAME TO "RewardTarget_old";
ALTER TYPE "RewardTarget_new" RENAME TO "RewardTarget";
DROP TYPE "RewardTarget_old";
ALTER TABLE "Reward" ALTER COLUMN "rewardTarget" SET DEFAULT 'EXP';
COMMIT;
