/*
  Warnings:

  - The values [WRITING] on the enum `QuestionType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "QuestionType_new" AS ENUM ('VOCABULARY', 'GRAMMAR', 'KANJI', 'LISTENING', 'READING', 'SPEAKING', 'GENERAL');
ALTER TABLE "QuestionBank" ALTER COLUMN "questionType" DROP DEFAULT;
ALTER TABLE "TestSetQuestionBank" ALTER COLUMN "questionType" DROP DEFAULT;
ALTER TABLE "QuestionBank" ALTER COLUMN "questionType" TYPE "QuestionType_new" USING ("questionType"::text::"QuestionType_new");
ALTER TABLE "TestSetQuestionBank" ALTER COLUMN "questionType" TYPE "QuestionType_new" USING ("questionType"::text::"QuestionType_new");
ALTER TYPE "QuestionType" RENAME TO "QuestionType_old";
ALTER TYPE "QuestionType_new" RENAME TO "QuestionType";
DROP TYPE "QuestionType_old";
ALTER TABLE "QuestionBank" ALTER COLUMN "questionType" SET DEFAULT 'VOCABULARY';
ALTER TABLE "TestSetQuestionBank" ALTER COLUMN "questionType" SET DEFAULT 'VOCABULARY';
COMMIT;

-- AlterTable
ALTER TABLE "Exercises" ALTER COLUMN "testSetId" DROP NOT NULL;
