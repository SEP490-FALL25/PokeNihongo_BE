-- CreateEnum
CREATE TYPE "TestAttemptStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAIL', 'ABANDONED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "TestStatus" AS ENUM ('PLACEMENT_TEST_DONE', 'MATCH_TEST', 'QUIZ_TEST', 'REVIEW_TEST', 'PRACTICE_TEST');

-- CreateTable
CREATE TABLE "Test" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2),
    "levelN" INTEGER DEFAULT 0,
    "testType" "TestStatus" NOT NULL DEFAULT 'PLACEMENT_TEST_DONE',
    "status" "TestSetStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "creatorId" INTEGER,

    CONSTRAINT "Test_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTestAttempt" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "testId" INTEGER NOT NULL,
    "time" INTEGER DEFAULT 0,
    "status" "TestAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "score" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTestAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTestAnswerLog" (
    "id" SERIAL NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "userTestAttemptId" INTEGER NOT NULL,
    "questionBankId" INTEGER NOT NULL,
    "answerId" INTEGER NOT NULL,
    "turnNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTestAnswerLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Test_testType_idx" ON "Test"("testType");

-- CreateIndex
CREATE INDEX "Test_status_idx" ON "Test"("status");

-- CreateIndex
CREATE INDEX "Test_creatorId_idx" ON "Test"("creatorId");

-- CreateIndex
CREATE INDEX "UserTestAttempt_userId_idx" ON "UserTestAttempt"("userId");

-- CreateIndex
CREATE INDEX "UserTestAttempt_testId_idx" ON "UserTestAttempt"("testId");

-- CreateIndex
CREATE INDEX "UserTestAttempt_status_idx" ON "UserTestAttempt"("status");

-- CreateIndex
CREATE INDEX "UserTestAnswerLog_userTestAttemptId_idx" ON "UserTestAnswerLog"("userTestAttemptId");

-- CreateIndex
CREATE INDEX "UserTestAnswerLog_questionBankId_idx" ON "UserTestAnswerLog"("questionBankId");

-- CreateIndex
CREATE INDEX "UserTestAnswerLog_answerId_idx" ON "UserTestAnswerLog"("answerId");

-- CreateIndex
CREATE INDEX "UserTestAnswerLog_turnNumber_idx" ON "UserTestAnswerLog"("turnNumber");

-- CreateIndex
CREATE INDEX "TestSet_testId_idx" ON "TestSet"("testId");

-- AddForeignKey
ALTER TABLE "TestSet" ADD CONSTRAINT "TestSet_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "UserTestAttempt" ADD CONSTRAINT "UserTestAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "UserTestAttempt" ADD CONSTRAINT "UserTestAttempt_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "UserTestAnswerLog" ADD CONSTRAINT "UserTestAnswerLog_userTestAttemptId_fkey" FOREIGN KEY ("userTestAttemptId") REFERENCES "UserTestAttempt"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "UserTestAnswerLog" ADD CONSTRAINT "UserTestAnswerLog_questionBankId_fkey" FOREIGN KEY ("questionBankId") REFERENCES "QuestionBank"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "UserTestAnswerLog" ADD CONSTRAINT "UserTestAnswerLog_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "Answer"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
