-- DropForeignKey
ALTER TABLE "Translation" DROP CONSTRAINT "Translation_key_fkey";

-- AlterTable
ALTER TABLE "Translation" ADD COLUMN     "rewardNameKey" TEXT;

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_rewardNameKey_fkey" FOREIGN KEY ("rewardNameKey") REFERENCES "Reward"("nameKey") ON DELETE CASCADE ON UPDATE CASCADE;
