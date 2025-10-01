-- CreateTable
CREATE TABLE "Vocabulary" (
    "id" SERIAL NOT NULL,
    "wordJp" VARCHAR(500) NOT NULL,
    "reading" VARCHAR(500) NOT NULL,
    "imageUrl" VARCHAR(1000),
    "audioUrl" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vocabulary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Vocabulary_wordJp_idx" ON "Vocabulary"("wordJp");

-- CreateIndex
CREATE INDEX "Vocabulary_reading_idx" ON "Vocabulary"("reading");
