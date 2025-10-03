/*
  Warnings:

  - A unique constraint covering the columns `[levelNumber,levelType]` on the table `Level` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Level_levelNumber_levelType_key" ON "Level"("levelNumber", "levelType");
