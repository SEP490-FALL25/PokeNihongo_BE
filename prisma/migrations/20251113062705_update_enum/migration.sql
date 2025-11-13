/*
  Warnings:

  - The values [FAIL] on the enum `ExerciseAttemptStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ExerciseAttemptStatus_new" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'ABANDONED', 'SKIPPED');
ALTER TABLE "UserExerciseAttempt" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "UserExerciseAttempt" ALTER COLUMN "status" TYPE "ExerciseAttemptStatus_new" USING ("status"::text::"ExerciseAttemptStatus_new");
ALTER TYPE "ExerciseAttemptStatus" RENAME TO "ExerciseAttemptStatus_old";
ALTER TYPE "ExerciseAttemptStatus_new" RENAME TO "ExerciseAttemptStatus";
DROP TYPE "ExerciseAttemptStatus_old";
ALTER TABLE "UserExerciseAttempt" ALTER COLUMN "status" SET DEFAULT 'IN_PROGRESS';
COMMIT;
