-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('WAITING', 'MATCHED');

-- CreateEnum
CREATE TYPE "TestStatus" AS ENUM ('PLACEMENT_TEST_DONE', 'MATCH_TEST', 'QUIZ_TEST', 'REVIEW_TEST', 'PRACTICE_TEST');

-- CreateTable
CREATE TABLE "MatchmakingQueue" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "userElo" INTEGER NOT NULL,
    "status" "QueueStatus" NOT NULL DEFAULT 'WAITING',
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "selectedPokemon1Id" INTEGER NOT NULL,
    "selectedPokemon2Id" INTEGER NOT NULL,
    "selectedPokemon3Id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MatchmakingQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchmakingQueue_userId_key" ON "MatchmakingQueue"("userId");

-- CreateIndex
CREATE INDEX "MatchmakingQueue_status_userElo_idx" ON "MatchmakingQueue"("status", "userElo");

-- CreateIndex
CREATE INDEX "MatchmakingQueue_userId_idx" ON "MatchmakingQueue"("userId");

-- AddForeignKey
ALTER TABLE "MatchmakingQueue" ADD CONSTRAINT "MatchmakingQueue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchmakingQueue" ADD CONSTRAINT "MatchmakingQueue_selectedPokemon1Id_fkey" FOREIGN KEY ("selectedPokemon1Id") REFERENCES "UserPokemon"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchmakingQueue" ADD CONSTRAINT "MatchmakingQueue_selectedPokemon2Id_fkey" FOREIGN KEY ("selectedPokemon2Id") REFERENCES "UserPokemon"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchmakingQueue" ADD CONSTRAINT "MatchmakingQueue_selectedPokemon3Id_fkey" FOREIGN KEY ("selectedPokemon3Id") REFERENCES "UserPokemon"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
