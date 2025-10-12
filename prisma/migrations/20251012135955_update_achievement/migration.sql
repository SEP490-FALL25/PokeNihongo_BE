/*
  Warnings:

  - Made the column `descriptionKey` on table `AchievementGroup` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Achievement" ALTER COLUMN "descriptionKey" SET DATA TYPE TEXT,
ALTER COLUMN "nameKey" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "AchievementGroup" ALTER COLUMN "descriptionKey" SET NOT NULL,
ALTER COLUMN "descriptionKey" SET DATA TYPE TEXT,
ALTER COLUMN "nameKey" SET DATA TYPE TEXT;
