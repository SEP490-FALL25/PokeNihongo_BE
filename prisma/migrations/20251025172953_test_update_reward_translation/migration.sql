/*
  Warnings:

  - A unique constraint covering the columns `[nameKey]` on the table `Reward` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Reward_nameKey_key" ON "Reward"("nameKey");

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_key_fkey" FOREIGN KEY ("key") REFERENCES "Reward"("nameKey") ON DELETE CASCADE ON UPDATE CASCADE;
