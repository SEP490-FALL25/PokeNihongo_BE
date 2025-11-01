/*
  Warnings:

  - You are about to drop the column `testId` on the `TestSet` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "TestSet" DROP CONSTRAINT "TestSet_testId_fkey";

-- DropIndex
DROP INDEX "TestSet_testId_idx";

-- AlterTable
ALTER TABLE "TestSet" DROP COLUMN "testId";

-- CreateTable
CREATE TABLE "TestTestSet" (
    "id" SERIAL NOT NULL,
    "testId" INTEGER NOT NULL,
    "testSetId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestTestSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TestTestSet_testId_idx" ON "TestTestSet"("testId");

-- CreateIndex
CREATE INDEX "TestTestSet_testSetId_idx" ON "TestTestSet"("testSetId");

-- CreateIndex
CREATE UNIQUE INDEX "TestTestSet_testId_testSetId_key" ON "TestTestSet"("testId", "testSetId");

-- AddForeignKey
ALTER TABLE "TestTestSet" ADD CONSTRAINT "TestTestSet_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TestTestSet" ADD CONSTRAINT "TestTestSet_testSetId_fkey" FOREIGN KEY ("testSetId") REFERENCES "TestSet"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
