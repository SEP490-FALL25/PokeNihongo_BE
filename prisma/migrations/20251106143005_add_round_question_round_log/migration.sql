-- CreateTable
CREATE TABLE "RoundQuestions" (
    "id" SERIAL NOT NULL,
    "matchRoundParticipantId" INTEGER NOT NULL,
    "questionBankId" INTEGER NOT NULL,
    "timeLimitMs" INTEGER NOT NULL DEFAULT 60000,
    "basePoints" INTEGER NOT NULL DEFAULT 100,
    "orderNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RoundQuestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundQuestionsAnswerLog" (
    "id" SERIAL NOT NULL,
    "roundQuestionId" INTEGER NOT NULL,
    "answerId" INTEGER,
    "isCorrect" BOOLEAN NOT NULL,
    "timeAnswerMs" INTEGER NOT NULL,
    "pointsEarned" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RoundQuestionsAnswerLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoundQuestions_matchRoundParticipantId_idx" ON "RoundQuestions"("matchRoundParticipantId");

-- CreateIndex
CREATE INDEX "RoundQuestions_questionBankId_idx" ON "RoundQuestions"("questionBankId");

-- CreateIndex
CREATE INDEX "RoundQuestionsAnswerLog_roundQuestionId_idx" ON "RoundQuestionsAnswerLog"("roundQuestionId");

-- CreateIndex
CREATE INDEX "RoundQuestionsAnswerLog_answerId_idx" ON "RoundQuestionsAnswerLog"("answerId");

-- AddForeignKey
ALTER TABLE "RoundQuestions" ADD CONSTRAINT "RoundQuestions_matchRoundParticipantId_fkey" FOREIGN KEY ("matchRoundParticipantId") REFERENCES "MatchRoundParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundQuestions" ADD CONSTRAINT "RoundQuestions_questionBankId_fkey" FOREIGN KEY ("questionBankId") REFERENCES "QuestionBank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundQuestionsAnswerLog" ADD CONSTRAINT "RoundQuestionsAnswerLog_roundQuestionId_fkey" FOREIGN KEY ("roundQuestionId") REFERENCES "RoundQuestions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundQuestionsAnswerLog" ADD CONSTRAINT "RoundQuestionsAnswerLog_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "Answer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
