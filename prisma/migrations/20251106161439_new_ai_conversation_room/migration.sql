-- CreateTable
CREATE TABLE "AIConversationRoom" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "conversationId" VARCHAR(100) NOT NULL,
    "title" VARCHAR(200),
    "lastMessage" VARCHAR(500),
    "lastMessageAt" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIConversationRoom_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AIConversationRoom_conversationId_key" ON "AIConversationRoom"("conversationId");

-- CreateIndex
CREATE INDEX "AIConversationRoom_userId_idx" ON "AIConversationRoom"("userId");

-- CreateIndex
CREATE INDEX "AIConversationRoom_lastMessageAt_idx" ON "AIConversationRoom"("lastMessageAt");

-- CreateIndex
CREATE INDEX "AIConversationRoom_deletedAt_idx" ON "AIConversationRoom"("deletedAt");

-- AddForeignKey
ALTER TABLE "AIConversationRoom" ADD CONSTRAINT "AIConversationRoom_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
