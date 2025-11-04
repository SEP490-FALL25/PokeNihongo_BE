-- CreateEnum
CREATE TYPE "SrsContentType" AS ENUM ('VOCABULARY', 'GRAMMAR', 'KANJI');

-- CreateTable
CREATE TABLE "UserSrsReview" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "contentType" "SrsContentType" NOT NULL,
    "contentId" INTEGER NOT NULL,
    "srsLevel" INTEGER NOT NULL DEFAULT 0,
    "nextReviewDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "incorrectStreak" INTEGER NOT NULL DEFAULT 0,
    "isLeech" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSrsReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserSrsReview_userId_nextReviewDate_idx" ON "UserSrsReview"("userId", "nextReviewDate");

-- CreateIndex
CREATE UNIQUE INDEX "UserSrsReview_userId_contentType_contentId_key" ON "UserSrsReview"("userId", "contentType", "contentId");

-- AddForeignKey
ALTER TABLE "UserSrsReview" ADD CONSTRAINT "UserSrsReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
