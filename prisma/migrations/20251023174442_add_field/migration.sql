/*
  Warnings:

  - You are about to drop the column `conditionMeta` on the `Achievement` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Achievement" DROP COLUMN "conditionMeta",
ADD COLUMN     "conditionElementId" INTEGER;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_conditionElementId_fkey" FOREIGN KEY ("conditionElementId") REFERENCES "ElementalType"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
