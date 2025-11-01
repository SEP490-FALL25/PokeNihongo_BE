-- CreateEnum
CREATE TYPE "UserTestStatus" AS ENUM ('NOT_STARTED', 'ACTIVE');

-- AlterTable
ALTER TABLE "Test" ADD COLUMN     "limit" INTEGER DEFAULT 0;

-- CreateTable
CREATE TABLE "UserTest" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "testId" INTEGER NOT NULL,
    "status" "UserTestStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "limit" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserTest_userId_idx" ON "UserTest"("userId");

-- CreateIndex
CREATE INDEX "UserTest_testId_idx" ON "UserTest"("testId");

-- CreateIndex
CREATE UNIQUE INDEX "UserTest_userId_testId_key" ON "UserTest"("userId", "testId");

-- AddForeignKey
ALTER TABLE "UserTest" ADD CONSTRAINT "UserTest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "UserTest" ADD CONSTRAINT "UserTest_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
