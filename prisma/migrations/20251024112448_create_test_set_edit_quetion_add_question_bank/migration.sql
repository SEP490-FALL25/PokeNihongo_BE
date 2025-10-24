/*
  Warnings:

  - You are about to drop the column `questionId` on the `Answer` table. All the data in the column will be lost.
  - You are about to drop the column `audioUrl` on the `Exercises` table. All the data in the column will be lost.
  - You are about to drop the column `content` on the `Exercises` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Exercises` table. All the data in the column will be lost.
  - You are about to drop the column `questionId` on the `UserAnswerLog` table. All the data in the column will be lost.
  - You are about to drop the `Question` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Question_Bank` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[testSetId]` on the table `Exercises` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `questionBankId` to the `Answer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `testSetId` to the `Exercises` table without a default value. This is not possible if the table is not empty.
  - Added the required column `questionBankId` to the `UserAnswerLog` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TestSetStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('VOCABULARY', 'GRAMMAR', 'KANJI', 'LISTENING', 'READING', 'WRITING', 'SPEAKING', 'GENERAL');

-- DropForeignKey
ALTER TABLE "Answer" DROP CONSTRAINT "Answer_questionId_fkey";

-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_exercisesId_fkey";

-- DropForeignKey
ALTER TABLE "Question_Bank" DROP CONSTRAINT "Question_Bank_creatorId_fkey";

-- DropForeignKey
ALTER TABLE "Question_Bank" DROP CONSTRAINT "Question_Bank_questionId_fkey";

-- DropForeignKey
ALTER TABLE "UserAnswerLog" DROP CONSTRAINT "UserAnswerLog_questionId_fkey";

-- DropIndex
DROP INDEX "Answer_questionId_idx";

-- DropIndex
DROP INDEX "UserAnswerLog_questionId_idx";

-- AlterTable
ALTER TABLE "Answer" DROP COLUMN "questionId",
ADD COLUMN     "questionBankId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Exercises" DROP COLUMN "audioUrl",
DROP COLUMN "content",
DROP COLUMN "price",
ADD COLUMN     "testSetId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "UserAnswerLog" DROP COLUMN "questionId",
ADD COLUMN     "questionBankId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "Question";

-- DropTable
DROP TABLE "Question_Bank";

-- DropEnum
DROP TYPE "QuestionBankStatus";

-- CreateTable
CREATE TABLE "QuestionBank" (
    "id" SERIAL NOT NULL,
    "questionJp" VARCHAR(1000),
    "questionType" "QuestionType" NOT NULL DEFAULT 'VOCABULARY',
    "audioUrl" VARCHAR(1000),
    "questionOrder" INTEGER NOT NULL DEFAULT 0,
    "questionKey" VARCHAR(200),
    "pronunciation" VARCHAR(1000),
    "levelN" INTEGER DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionBank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestSet" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "content" TEXT,
    "audioUrl" VARCHAR(1000),
    "price" DECIMAL(10,2),
    "levelN" INTEGER,
    "testType" VARCHAR(50) NOT NULL,
    "status" "TestSetStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "creatorId" INTEGER,

    CONSTRAINT "TestSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestSetQuestionBank" (
    "id" SERIAL NOT NULL,
    "testSetId" INTEGER NOT NULL,
    "questionBankId" INTEGER NOT NULL,
    "questionType" "QuestionType" NOT NULL DEFAULT 'VOCABULARY',
    "questionOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestSetQuestionBank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSpeakingAttempt" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "questionBankId" INTEGER NOT NULL,
    "userAudioUrl" VARCHAR(1000) NOT NULL,
    "userTranscription" VARCHAR(1000),
    "confidence" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "pronunciation" DOUBLE PRECISION,
    "fluency" DOUBLE PRECISION,
    "overallScore" DOUBLE PRECISION,
    "processingTime" INTEGER,
    "googleApiResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSpeakingAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestionBank_questionType_idx" ON "QuestionBank"("questionType");

-- CreateIndex
CREATE INDEX "QuestionBank_questionOrder_idx" ON "QuestionBank"("questionOrder");

-- CreateIndex
CREATE INDEX "QuestionBank_questionKey_idx" ON "QuestionBank"("questionKey");

-- CreateIndex
CREATE INDEX "TestSet_levelN_idx" ON "TestSet"("levelN");

-- CreateIndex
CREATE INDEX "TestSet_testType_idx" ON "TestSet"("testType");

-- CreateIndex
CREATE INDEX "TestSet_status_idx" ON "TestSet"("status");

-- CreateIndex
CREATE INDEX "TestSet_creatorId_idx" ON "TestSet"("creatorId");

-- CreateIndex
CREATE INDEX "TestSetQuestionBank_testSetId_idx" ON "TestSetQuestionBank"("testSetId");

-- CreateIndex
CREATE INDEX "TestSetQuestionBank_questionBankId_idx" ON "TestSetQuestionBank"("questionBankId");

-- CreateIndex
CREATE INDEX "TestSetQuestionBank_questionType_idx" ON "TestSetQuestionBank"("questionType");

-- CreateIndex
CREATE INDEX "TestSetQuestionBank_questionOrder_idx" ON "TestSetQuestionBank"("questionOrder");

-- CreateIndex
CREATE UNIQUE INDEX "TestSetQuestionBank_testSetId_questionBankId_key" ON "TestSetQuestionBank"("testSetId", "questionBankId");

-- CreateIndex
CREATE INDEX "UserSpeakingAttempt_userId_idx" ON "UserSpeakingAttempt"("userId");

-- CreateIndex
CREATE INDEX "UserSpeakingAttempt_questionBankId_idx" ON "UserSpeakingAttempt"("questionBankId");

-- CreateIndex
CREATE INDEX "UserSpeakingAttempt_overallScore_idx" ON "UserSpeakingAttempt"("overallScore");

-- CreateIndex
CREATE INDEX "UserSpeakingAttempt_createdAt_idx" ON "UserSpeakingAttempt"("createdAt");

-- CreateIndex
CREATE INDEX "Answer_questionBankId_idx" ON "Answer"("questionBankId");

-- CreateIndex
CREATE UNIQUE INDEX "Exercises_testSetId_key" ON "Exercises"("testSetId");

-- CreateIndex
CREATE INDEX "Exercises_testSetId_idx" ON "Exercises"("testSetId");

-- CreateIndex
CREATE INDEX "UserAnswerLog_questionBankId_idx" ON "UserAnswerLog"("questionBankId");

-- AddForeignKey
ALTER TABLE "Exercises" ADD CONSTRAINT "Exercises_testSetId_fkey" FOREIGN KEY ("testSetId") REFERENCES "TestSet"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TestSet" ADD CONSTRAINT "TestSet_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TestSetQuestionBank" ADD CONSTRAINT "TestSetQuestionBank_testSetId_fkey" FOREIGN KEY ("testSetId") REFERENCES "TestSet"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TestSetQuestionBank" ADD CONSTRAINT "TestSetQuestionBank_questionBankId_fkey" FOREIGN KEY ("questionBankId") REFERENCES "QuestionBank"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_questionBankId_fkey" FOREIGN KEY ("questionBankId") REFERENCES "QuestionBank"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "UserAnswerLog" ADD CONSTRAINT "UserAnswerLog_questionBankId_fkey" FOREIGN KEY ("questionBankId") REFERENCES "QuestionBank"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "UserSpeakingAttempt" ADD CONSTRAINT "UserSpeakingAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "UserSpeakingAttempt" ADD CONSTRAINT "UserSpeakingAttempt_questionBankId_fkey" FOREIGN KEY ("questionBankId") REFERENCES "QuestionBank"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
