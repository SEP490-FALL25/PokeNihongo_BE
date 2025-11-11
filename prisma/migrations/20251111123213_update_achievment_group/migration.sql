/*
  Warnings:

  - You are about to drop the column `descriptionKey` on the `AchievementGroup` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[nameKey]` on the table `Achievement` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[descriptionKey]` on the table `Achievement` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[conditionTextKey]` on the table `Achievement` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nameKey]` on the table `AchievementGroup` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `conditionTextKey` to the `Achievement` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Achievement" ADD COLUMN     "conditionTextKey" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "AchievementGroup" DROP COLUMN "descriptionKey";

-- AlterTable
ALTER TABLE "Translation" ADD COLUMN     "achievementConditionTextKey" TEXT,
ADD COLUMN     "achievementDescriptionKey" TEXT,
ADD COLUMN     "achievementGroupNameKey" TEXT,
ADD COLUMN     "achievementNameKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_nameKey_key" ON "Achievement"("nameKey");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_descriptionKey_key" ON "Achievement"("descriptionKey");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_conditionTextKey_key" ON "Achievement"("conditionTextKey");

-- CreateIndex
CREATE UNIQUE INDEX "AchievementGroup_nameKey_key" ON "AchievementGroup"("nameKey");

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_achievementGroupNameKey_fkey" FOREIGN KEY ("achievementGroupNameKey") REFERENCES "AchievementGroup"("nameKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_achievementNameKey_fkey" FOREIGN KEY ("achievementNameKey") REFERENCES "Achievement"("nameKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_achievementDescriptionKey_fkey" FOREIGN KEY ("achievementDescriptionKey") REFERENCES "Achievement"("descriptionKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_achievementConditionTextKey_fkey" FOREIGN KEY ("achievementConditionTextKey") REFERENCES "Achievement"("conditionTextKey") ON DELETE CASCADE ON UPDATE CASCADE;
