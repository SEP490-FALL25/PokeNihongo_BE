/*
  Warnings:

  - You are about to drop the column `featureKey` on the `SubscriptionFeature` table. All the data in the column will be lost.
  - Added the required column `featureId` to the `SubscriptionFeature` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SubscriptionFeature" DROP COLUMN "featureKey",
ADD COLUMN     "featureId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Translation" ADD COLUMN     "featureNameKey" TEXT;

-- CreateTable
CREATE TABLE "Feature" (
    "id" SERIAL NOT NULL,
    "nameKey" TEXT NOT NULL,
    "featureKey" "FeatureKey" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Feature_nameKey_key" ON "Feature"("nameKey");

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_featureNameKey_fkey" FOREIGN KEY ("featureNameKey") REFERENCES "Feature"("nameKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionFeature" ADD CONSTRAINT "SubscriptionFeature_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
