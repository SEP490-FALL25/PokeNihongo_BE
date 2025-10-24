-- CreateEnum
CREATE TYPE "ExerciseAttemptStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- AlterTable
ALTER TABLE "UserExerciseAttempt" ADD COLUMN     "status" "ExerciseAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS';

-- CreateIndex
CREATE INDEX "UserExerciseAttempt_status_idx" ON "UserExerciseAttempt"("status");
