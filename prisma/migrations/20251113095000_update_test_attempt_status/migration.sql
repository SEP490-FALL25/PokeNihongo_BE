-- Adjust TestAttemptStatus enum to rename FAIL -> FAILED

-- Create new enum with desired values
CREATE TYPE "TestAttemptStatus_new" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'ABANDONED', 'SKIPPED');

-- Update columns referencing the old enum
ALTER TABLE "UserTestAttempt"
  ALTER COLUMN "status" TYPE "TestAttemptStatus_new" USING "status"::text::"TestAttemptStatus_new";

-- Swap enum types
ALTER TYPE "TestAttemptStatus" RENAME TO "TestAttemptStatus_old";
ALTER TYPE "TestAttemptStatus_new" RENAME TO "TestAttemptStatus";
DROP TYPE "TestAttemptStatus_old";

