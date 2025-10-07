-- CreateTable
CREATE TABLE "Grammar" (
    "id" SERIAL NOT NULL,
    "structure" VARCHAR(500) NOT NULL,
    "level" VARCHAR(10) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grammar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrammarUsage" (
    "id" SERIAL NOT NULL,
    "grammarId" INTEGER NOT NULL,
    "explanationKey" VARCHAR(200) NOT NULL,
    "exampleSentenceJp" VARCHAR(1000) NOT NULL,
    "exampleSentenceKey" VARCHAR(200) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrammarUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Grammar_level_idx" ON "Grammar"("level");

-- CreateIndex
CREATE INDEX "Grammar_structure_idx" ON "Grammar"("structure");

-- CreateIndex
CREATE INDEX "GrammarUsage_grammarId_idx" ON "GrammarUsage"("grammarId");

-- CreateIndex
CREATE INDEX "GrammarUsage_explanationKey_idx" ON "GrammarUsage"("explanationKey");

-- AddForeignKey
ALTER TABLE "GrammarUsage" ADD CONSTRAINT "GrammarUsage_grammarId_fkey" FOREIGN KEY ("grammarId") REFERENCES "Grammar"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
