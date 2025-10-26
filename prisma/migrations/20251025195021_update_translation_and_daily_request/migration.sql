/*
  Warnings:

  - A unique constraint covering the columns `[nameKey]` on the table `DailyRequest` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[descriptionKey]` on the table `DailyRequest` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Translation" ADD COLUMN     "dailyRequestDescriptionKey" TEXT,

ADD COLUMN     "dailyRequestNameKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "DailyRequest_nameKey_key" ON "DailyRequest"("nameKey");

-- CreateIndex
CREATE UNIQUE INDEX "DailyRequest_descriptionKey_key" ON "DailyRequest"("descriptionKey") ;

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_dailyRequestNameKey_fkey" FOREIGN KEY ("dailyRequestNameKey") REFERENCES "DailyRequest"("nameKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_dailyRequestDescriptionKey_fkey" FOREIGN KEY ("dailyRequestDescriptionKey") REFERENCES "DailyRequest"("descriptionKey") ON DELETE CASCADE ON UPDATE CASCADE;
