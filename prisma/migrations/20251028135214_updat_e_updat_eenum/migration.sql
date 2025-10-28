/*
  Warnings:

  - The values [QUIZ_ATTEMPT] on the enum `TransactionPurpose` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TransactionPurpose_new" AS ENUM ('SUBSCRIPTION', 'GACHA', 'SHOP', 'DAILY_REQUEST', 'REWARD', 'REFUND');
ALTER TABLE "WalletTransaction" ALTER COLUMN "purpose" TYPE "TransactionPurpose_new" USING ("purpose"::text::"TransactionPurpose_new");
ALTER TYPE "TransactionPurpose" RENAME TO "TransactionPurpose_old";
ALTER TYPE "TransactionPurpose_new" RENAME TO "TransactionPurpose";
DROP TYPE "TransactionPurpose_old";
COMMIT;
