-- CreateEnum
CREATE TYPE "RecommendationTargetType" AS ENUM ('EXERCISE', 'TEST', 'LESSON', 'VOCABULARY');

-- CreateEnum
CREATE TYPE "RecommendationSourceType" AS ENUM ('PERSONALIZED', 'SRS');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('PENDING', 'DONE', 'DISMISSED');

-- CreateTable
CREATE TABLE "UserAIRecommendation" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "targetType" "RecommendationTargetType" NOT NULL,
    "targetId" INTEGER NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "source" "RecommendationSourceType" NOT NULL DEFAULT 'PERSONALIZED',
    "modelUsed" VARCHAR(100),
    "status" "RecommendationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAIRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserAIRecommendation_userId_status_idx" ON "UserAIRecommendation"("userId", "status");

-- CreateIndex
CREATE INDEX "UserAIRecommendation_userId_targetType_targetId_idx" ON "UserAIRecommendation"("userId", "targetType", "targetId");

-- AddForeignKey
ALTER TABLE "UserAIRecommendation" ADD CONSTRAINT "UserAIRecommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
