/*
  Warnings:

  - You are about to drop the column `questionOrder` on the `QuestionBank` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "QuestionBank_questionOrder_idx";

-- AlterTable
ALTER TABLE "QuestionBank" DROP COLUMN "questionOrder";
