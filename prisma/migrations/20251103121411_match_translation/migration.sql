-- AlterTable
ALTER TABLE "Translation" ADD COLUMN     "debuffRoundNameKey" TEXT;

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_debuffRoundNameKey_fkey" FOREIGN KEY ("debuffRoundNameKey") REFERENCES "DebuffRound"("nameKey") ON DELETE CASCADE ON UPDATE CASCADE;
