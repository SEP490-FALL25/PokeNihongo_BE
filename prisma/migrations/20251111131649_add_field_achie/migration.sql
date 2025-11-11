-- AlterTable
ALTER TABLE "Achievement" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "AchievementGroup" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;
