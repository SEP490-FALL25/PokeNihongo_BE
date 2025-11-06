/*
  Warnings:

  - You are about to drop the `RoundQuestions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "RoundQuestions" DROP CONSTRAINT "RoundQuestions_matchRoundParticipantId_fkey";

-- DropForeignKey
ALTER TABLE "RoundQuestions" DROP CONSTRAINT "RoundQuestions_questionBankId_fkey";

-- DropForeignKey
ALTER TABLE "RoundQuestionsAnswerLog" DROP CONSTRAINT "RoundQuestionsAnswerLog_roundQuestionId_fkey";

-- DropTable
DROP TABLE "RoundQuestions";

-- CreateTable
CREATE TABLE "RoundQuestion" (
    "id" SERIAL NOT NULL,
    "matchRoundParticipantId" INTEGER NOT NULL,
    "questionBankId" INTEGER NOT NULL,
    "timeLimitMs" INTEGER NOT NULL DEFAULT 60000,
    "basePoints" INTEGER NOT NULL DEFAULT 100,
    "orderNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RoundQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoundQuestion_matchRoundParticipantId_idx" ON "RoundQuestion"("matchRoundParticipantId");

-- CreateIndex
CREATE INDEX "RoundQuestion_questionBankId_idx" ON "RoundQuestion"("questionBankId");

-- AddForeignKey
ALTER TABLE "RoundQuestion" ADD CONSTRAINT "RoundQuestion_matchRoundParticipantId_fkey" FOREIGN KEY ("matchRoundParticipantId") REFERENCES "MatchRoundParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundQuestion" ADD CONSTRAINT "RoundQuestion_questionBankId_fkey" FOREIGN KEY ("questionBankId") REFERENCES "QuestionBank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundQuestionsAnswerLog" ADD CONSTRAINT "RoundQuestionsAnswerLog_roundQuestionId_fkey" FOREIGN KEY ("roundQuestionId") REFERENCES "RoundQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
