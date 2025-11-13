/*
  Warnings:

  - The values [FAIL] on the enum `TestAttemptStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TestAttemptStatus_new" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'ABANDONED', 'SKIPPED');
ALTER TABLE "UserTestAttempt" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "UserTestAttempt" ALTER COLUMN "status" TYPE "TestAttemptStatus_new" USING ("status"::text::"TestAttemptStatus_new");
ALTER TYPE "TestAttemptStatus" RENAME TO "TestAttemptStatus_old";
ALTER TYPE "TestAttemptStatus_new" RENAME TO "TestAttemptStatus";
DROP TYPE "TestAttemptStatus_old";
ALTER TABLE "UserTestAttempt" ALTER COLUMN "status" SET DEFAULT 'IN_PROGRESS';
COMMIT;
