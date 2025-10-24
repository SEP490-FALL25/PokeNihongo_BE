/*
  Warnings:

  - The `testType` column on the `TestSet` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `testsetType` on the `TestSetQuestionBank` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "TestSetQuestionBank_testsetType_idx";

-- AlterTable
ALTER TABLE "TestSet" DROP COLUMN "testType",
ADD COLUMN     "testType" "QuestionType" NOT NULL DEFAULT 'VOCABULARY';

-- AlterTable
ALTER TABLE "TestSetQuestionBank" DROP COLUMN "testsetType";

-- CreateIndex
CREATE INDEX "TestSet_testType_idx" ON "TestSet"("testType");
