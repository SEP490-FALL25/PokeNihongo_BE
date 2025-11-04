-- AlterTable
ALTER TABLE "GeminiConfigModel" ADD COLUMN     "presetId" INTEGER;

-- CreateTable
CREATE TABLE "GeminiModelPreset" (
    "id" SERIAL NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "temperature" DOUBLE PRECISION,
    "topP" DOUBLE PRECISION,
    "topK" INTEGER,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeminiModelPreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GeminiModelPreset_key_key" ON "GeminiModelPreset"("key");

-- CreateIndex
CREATE INDEX "GeminiConfigModel_presetId_idx" ON "GeminiConfigModel"("presetId");

-- AddForeignKey
ALTER TABLE "GeminiConfigModel" ADD CONSTRAINT "GeminiConfigModel_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "GeminiModelPreset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
