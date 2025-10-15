-- CreateEnum
CREATE TYPE "QuestionBankStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "UserExerciseAttempt" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "exerciseId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserExerciseAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAnswerLog" (
    "id" SERIAL NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "userExerciseAttemptId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "answerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAnswerLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question_Bank" (
    "id" SERIAL NOT NULL,
    "titleKey" VARCHAR(200) NOT NULL,
    "descriptionKey" VARCHAR(500) NOT NULL,
    "levelN" INTEGER,
    "bankType" VARCHAR(50) NOT NULL,
    "status" "QuestionBankStatus" NOT NULL DEFAULT 'DRAFT',
    "questionId" INTEGER NOT NULL,
    "creatorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_Bank_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserExerciseAttempt_userId_idx" ON "UserExerciseAttempt"("userId");

-- CreateIndex
CREATE INDEX "UserExerciseAttempt_exerciseId_idx" ON "UserExerciseAttempt"("exerciseId");

-- CreateIndex
CREATE INDEX "UserAnswerLog_userExerciseAttemptId_idx" ON "UserAnswerLog"("userExerciseAttemptId");

-- CreateIndex
CREATE INDEX "UserAnswerLog_questionId_idx" ON "UserAnswerLog"("questionId");

-- CreateIndex
CREATE INDEX "UserAnswerLog_answerId_idx" ON "UserAnswerLog"("answerId");

-- CreateIndex
CREATE INDEX "Question_Bank_titleKey_idx" ON "Question_Bank"("titleKey");

-- CreateIndex
CREATE INDEX "Question_Bank_levelN_idx" ON "Question_Bank"("levelN");

-- CreateIndex
CREATE INDEX "Question_Bank_bankType_idx" ON "Question_Bank"("bankType");

-- CreateIndex
CREATE INDEX "Question_Bank_status_idx" ON "Question_Bank"("status");

-- CreateIndex
CREATE INDEX "Question_Bank_questionId_idx" ON "Question_Bank"("questionId");

-- CreateIndex
CREATE INDEX "Question_Bank_creatorId_idx" ON "Question_Bank"("creatorId");

-- AddForeignKey
ALTER TABLE "UserExerciseAttempt" ADD CONSTRAINT "UserExerciseAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "UserExerciseAttempt" ADD CONSTRAINT "UserExerciseAttempt_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercises"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "UserAnswerLog" ADD CONSTRAINT "UserAnswerLog_userExerciseAttemptId_fkey" FOREIGN KEY ("userExerciseAttemptId") REFERENCES "UserExerciseAttempt"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "UserAnswerLog" ADD CONSTRAINT "UserAnswerLog_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "UserAnswerLog" ADD CONSTRAINT "UserAnswerLog_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "Answer"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Question_Bank" ADD CONSTRAINT "Question_Bank_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Question_Bank" ADD CONSTRAINT "Question_Bank_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
