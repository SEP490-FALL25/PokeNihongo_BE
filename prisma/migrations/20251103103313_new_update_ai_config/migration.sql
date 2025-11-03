/*
  Warnings:

  - You are about to drop the column `configType` on the `GeminiConfig` table. All the data in the column will be lost.
  - You are about to drop the column `modelName` on the `GeminiConfig` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `GeminiModel` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[key]` on the table `GeminiModel` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `geminiConfigModelId` to the `GeminiConfig` table without a default value. This is not possible if the table is not empty.
  - Added the required column `displayName` to the `GeminiModel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `key` to the `GeminiModel` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "GeminiConfig_configType_isActive_idx";

-- DropIndex
DROP INDEX "GeminiConfig_configType_key";

-- DropIndex
DROP INDEX "GeminiModel_name_key";

-- AlterTable
ALTER TABLE "GeminiConfig" DROP COLUMN "configType",
DROP COLUMN "modelName",
ADD COLUMN     "geminiConfigModelId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "GeminiModel" DROP COLUMN "name",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "displayName" VARCHAR(100) NOT NULL,
ADD COLUMN     "isEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "key" VARCHAR(100) NOT NULL,
ADD COLUMN     "provider" VARCHAR(50) NOT NULL DEFAULT 'GEMINI';

-- CreateTable
CREATE TABLE "GeminiConfigModel" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "geminiModelId" INTEGER NOT NULL,
    "temperature" DOUBLE PRECISION,
    "topP" DOUBLE PRECISION,
    "topK" INTEGER,
    "maxTokens" INTEGER,
    "jsonMode" BOOLEAN DEFAULT false,
    "systemInstruction" TEXT,
    "safetySettings" JSONB,
    "extraParams" JSONB,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "deletedById" INTEGER,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "GeminiConfigModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeminiServiceConfig" (
    "id" SERIAL NOT NULL,
    "serviceType" "GeminiConfigType" NOT NULL,
    "geminiConfigId" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeminiServiceConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GeminiConfigModel_deletedAt_idx" ON "GeminiConfigModel"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GeminiServiceConfig_serviceType_geminiConfigId_key" ON "GeminiServiceConfig"("serviceType", "geminiConfigId");

-- CreateIndex
CREATE INDEX "GeminiConfig_isActive_idx" ON "GeminiConfig"("isActive");

-- CreateIndex
CREATE INDEX "GeminiConfig_geminiConfigModelId_idx" ON "GeminiConfig"("geminiConfigModelId");

-- CreateIndex
CREATE UNIQUE INDEX "GeminiModel_key_key" ON "GeminiModel"("key");

-- AddForeignKey
ALTER TABLE "GeminiConfig" ADD CONSTRAINT "GeminiConfig_geminiConfigModelId_fkey" FOREIGN KEY ("geminiConfigModelId") REFERENCES "GeminiConfigModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeminiConfigModel" ADD CONSTRAINT "GeminiConfigModel_geminiModelId_fkey" FOREIGN KEY ("geminiModelId") REFERENCES "GeminiModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeminiConfigModel" ADD CONSTRAINT "GeminiConfigModel_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "GeminiConfigModel" ADD CONSTRAINT "GeminiConfigModel_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "GeminiConfigModel" ADD CONSTRAINT "GeminiConfigModel_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "GeminiServiceConfig" ADD CONSTRAINT "GeminiServiceConfig_geminiConfigId_fkey" FOREIGN KEY ("geminiConfigId") REFERENCES "GeminiConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
