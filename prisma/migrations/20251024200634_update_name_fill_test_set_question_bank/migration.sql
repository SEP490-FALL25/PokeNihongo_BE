/*
  Warnings:

  - You are about to drop the column `questionType` on the `TestSetQuestionBank` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "TestSetQuestionBank_questionType_idx";

-- AlterTable
ALTER TABLE "TestSetQuestionBank" DROP COLUMN "questionType",
ADD COLUMN     "testsetType" "QuestionType" NOT NULL DEFAULT 'VOCABULARY';

-- CreateIndex
CREATE INDEX "TestSetQuestionBank_testsetType_idx" ON "TestSetQuestionBank"("testsetType");
