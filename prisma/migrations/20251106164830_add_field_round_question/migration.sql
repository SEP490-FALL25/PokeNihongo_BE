-- AlterTable
ALTER TABLE "RoundQuestion" ADD COLUMN     "debuffId" INTEGER;

-- AddForeignKey
ALTER TABLE "RoundQuestion" ADD CONSTRAINT "RoundQuestion_debuffId_fkey" FOREIGN KEY ("debuffId") REFERENCES "DebuffRound"("id") ON DELETE SET NULL ON UPDATE CASCADE;
