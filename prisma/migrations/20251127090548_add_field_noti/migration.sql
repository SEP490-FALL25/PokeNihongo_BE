-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REWARD', 'LESSON', 'EXERCISE', 'ACHIEVEMENT', 'SEASON', 'LEVEL', 'SYSTEM', 'OTHER');

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "type" "NotificationType" NOT NULL DEFAULT 'OTHER';
