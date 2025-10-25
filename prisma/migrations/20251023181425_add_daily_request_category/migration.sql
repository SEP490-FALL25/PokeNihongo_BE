/*
  Warnings:

  - You are about to drop the column `conditionType` on the `DailyRequest` table. All the data in the column will be lost.
  - Added the required column `dailyRequestCategoryId` to the `DailyRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DailyRequest" DROP COLUMN "conditionType",
ADD COLUMN     "dailyRequestCategoryId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "DailyRequestCategory" (
    "id" SERIAL NOT NULL,
    "nameKey" TEXT NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "deletedById" INTEGER,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyRequestCategory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DailyRequest" ADD CONSTRAINT "DailyRequest_dailyRequestCategoryId_fkey" FOREIGN KEY ("dailyRequestCategoryId") REFERENCES "DailyRequestCategory"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyRequestCategory" ADD CONSTRAINT "DailyRequestCategory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DailyRequestCategory" ADD CONSTRAINT "DailyRequestCategory_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DailyRequestCategory" ADD CONSTRAINT "DailyRequestCategory_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
