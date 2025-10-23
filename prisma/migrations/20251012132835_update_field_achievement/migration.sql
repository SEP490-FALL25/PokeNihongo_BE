/*
  Warnings:

  - You are about to drop the column `description` on the `Achievement` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Achievement` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `AchievementGroup` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `AchievementGroup` table. All the data in the column will be lost.
  - Added the required column `descriptionKey` to the `Achievement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nameKey` to the `Achievement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nameKey` to the `AchievementGroup` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "AchievementGroup_name_key";

-- AlterTable
ALTER TABLE "Achievement" DROP COLUMN "description",
DROP COLUMN "name",
ADD COLUMN     "descriptionKey" JSONB NOT NULL,
ADD COLUMN     "nameKey" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "AchievementGroup" DROP COLUMN "description",
DROP COLUMN "name",
ADD COLUMN     "descriptionKey" JSONB,
ADD COLUMN     "nameKey" JSONB NOT NULL;
