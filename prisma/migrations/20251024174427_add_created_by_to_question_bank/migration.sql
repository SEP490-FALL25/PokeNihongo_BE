-- AlterTable
ALTER TABLE "QuestionBank" ADD COLUMN     "createdById" INTEGER;

-- CreateIndex
CREATE INDEX "QuestionBank_createdById_idx" ON "QuestionBank"("createdById");

-- AddForeignKey
ALTER TABLE "QuestionBank" ADD CONSTRAINT "QuestionBank_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
