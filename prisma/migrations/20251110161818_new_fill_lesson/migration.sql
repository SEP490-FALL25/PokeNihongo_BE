-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "testId" INTEGER;

-- CreateIndex
CREATE INDEX "Lesson_testId_idx" ON "Lesson"("testId");

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
