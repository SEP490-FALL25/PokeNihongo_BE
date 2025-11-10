-- AlterTable
ALTER TABLE "UserProgress" ADD COLUMN     "testId" INTEGER;

-- CreateIndex
CREATE INDEX "UserProgress_testId_idx" ON "UserProgress"("testId");

-- AddForeignKey
ALTER TABLE "UserProgress" ADD CONSTRAINT "UserProgress_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
