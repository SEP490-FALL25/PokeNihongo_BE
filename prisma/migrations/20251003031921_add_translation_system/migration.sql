-- CreateTable
CREATE TABLE "Translation" (
    "id" SERIAL NOT NULL,
    "languageCode" VARCHAR(10) NOT NULL,
    "key" VARCHAR(500) NOT NULL,
    "value" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Translation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Translation_languageCode_idx" ON "Translation"("languageCode");

-- CreateIndex
CREATE INDEX "Translation_key_idx" ON "Translation"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Translation_languageCode_key_key" ON "Translation"("languageCode", "key");
