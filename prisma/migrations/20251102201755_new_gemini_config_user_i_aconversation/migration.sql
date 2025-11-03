-- CreateEnum
CREATE TYPE "GeminiConfigType" AS ENUM ('SPEAKING_EVALUATION', 'PERSONALIZED_RECOMMENDATIONS', 'AI_KAIWA');

-- CreateTable
CREATE TABLE "GeminiConfig" (
    "id" SERIAL NOT NULL,
    "configType" "GeminiConfigType" NOT NULL,
    "modelName" VARCHAR(100) NOT NULL DEFAULT 'gemini-1.5-pro',
    "prompt" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "deletedById" INTEGER,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeminiConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAIConversation" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "conversationId" VARCHAR(100) NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "message" TEXT NOT NULL,
    "audioUrl" VARCHAR(1000),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAIConversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GeminiConfig_configType_key" ON "GeminiConfig"("configType");

-- CreateIndex
CREATE INDEX "GeminiConfig_deletedAt_idx" ON "GeminiConfig"("deletedAt");

-- CreateIndex
CREATE INDEX "GeminiConfig_configType_isActive_idx" ON "GeminiConfig"("configType", "isActive");

-- CreateIndex
CREATE INDEX "UserAIConversation_userId_idx" ON "UserAIConversation"("userId");

-- CreateIndex
CREATE INDEX "UserAIConversation_conversationId_idx" ON "UserAIConversation"("conversationId");

-- CreateIndex
CREATE INDEX "UserAIConversation_createdAt_idx" ON "UserAIConversation"("createdAt");

-- CreateIndex
CREATE INDEX "UserAIConversation_deletedAt_idx" ON "UserAIConversation"("deletedAt");

-- AddForeignKey
ALTER TABLE "GeminiConfig" ADD CONSTRAINT "GeminiConfig_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "GeminiConfig" ADD CONSTRAINT "GeminiConfig_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "GeminiConfig" ADD CONSTRAINT "GeminiConfig_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "UserAIConversation" ADD CONSTRAINT "UserAIConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
