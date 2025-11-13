-- AlterTable
ALTER TABLE "Translation" ADD COLUMN     "subscriptionDescriptionKey" TEXT,
ADD COLUMN     "subscriptionNameKey" TEXT;

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_subscriptionNameKey_fkey" FOREIGN KEY ("subscriptionNameKey") REFERENCES "Subscription"("nameKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_subscriptionDescriptionKey_fkey" FOREIGN KEY ("subscriptionDescriptionKey") REFERENCES "Subscription"("descriptionKey") ON DELETE CASCADE ON UPDATE CASCADE;
