-- CreateTable
CREATE TABLE "LessonCategory" (
    "id" SERIAL NOT NULL,
    "nameKey" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(200) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" SERIAL NOT NULL,
    "slug" VARCHAR(200) NOT NULL,
    "titleKey" VARCHAR(500) NOT NULL,
    "levelJlpt" INTEGER,
    "estimatedTimeMinutes" INTEGER NOT NULL DEFAULT 30,
    "lessonOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "version" VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lessonCategoryId" INTEGER NOT NULL,
    "rewardId" INTEGER,
    "createdById" INTEGER NOT NULL,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonContents" (
    "id" SERIAL NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "contentId" INTEGER NOT NULL,
    "contentType" VARCHAR(50) NOT NULL,
    "contentOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonContents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LessonCategory_nameKey_key" ON "LessonCategory"("nameKey");

-- CreateIndex
CREATE UNIQUE INDEX "LessonCategory_slug_key" ON "LessonCategory"("slug");

-- CreateIndex
CREATE INDEX "LessonCategory_nameKey_idx" ON "LessonCategory"("nameKey");

-- CreateIndex
CREATE INDEX "LessonCategory_slug_idx" ON "LessonCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_slug_key" ON "Lesson"("slug");

-- CreateIndex
CREATE INDEX "Lesson_slug_idx" ON "Lesson"("slug");

-- CreateIndex
CREATE INDEX "Lesson_titleKey_idx" ON "Lesson"("titleKey");

-- CreateIndex
CREATE INDEX "Lesson_levelJlpt_idx" ON "Lesson"("levelJlpt");

-- CreateIndex
CREATE INDEX "Lesson_lessonCategoryId_idx" ON "Lesson"("lessonCategoryId");

-- CreateIndex
CREATE INDEX "Lesson_lessonOrder_idx" ON "Lesson"("lessonOrder");

-- CreateIndex
CREATE INDEX "Lesson_isPublished_idx" ON "Lesson"("isPublished");

-- CreateIndex
CREATE INDEX "Lesson_publishedAt_idx" ON "Lesson"("publishedAt");

-- CreateIndex
CREATE INDEX "LessonContents_lessonId_idx" ON "LessonContents"("lessonId");

-- CreateIndex
CREATE INDEX "LessonContents_contentId_idx" ON "LessonContents"("contentId");

-- CreateIndex
CREATE INDEX "LessonContents_contentType_idx" ON "LessonContents"("contentType");

-- CreateIndex
CREATE INDEX "LessonContents_contentOrder_idx" ON "LessonContents"("contentOrder");

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_lessonCategoryId_fkey" FOREIGN KEY ("lessonCategoryId") REFERENCES "LessonCategory"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "LessonContents" ADD CONSTRAINT "LessonContents_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
