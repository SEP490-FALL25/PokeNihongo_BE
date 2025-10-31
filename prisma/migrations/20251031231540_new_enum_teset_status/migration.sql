/*
  Warnings:

  - The `testType` column on the `TestSet` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "TestSetType" AS ENUM ('VOCABULARY', 'GRAMMAR', 'KANJI', 'LISTENING', 'READING', 'SPEAKING', 'GENERAL', 'MATCHING', 'PLACEMENT_TEST_DONE');

-- AlterTable
ALTER TABLE "TestSet" DROP COLUMN "testType",
ADD COLUMN     "testType" "TestSetType" NOT NULL DEFAULT 'VOCABULARY';

-- CreateIndex
CREATE INDEX "TestSet_testType_idx" ON "TestSet"("testType");
