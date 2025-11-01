/*
  Warnings:

  - You are about to drop the `MatchmakingQueue` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MatchmakingQueue" DROP CONSTRAINT "MatchmakingQueue_selectedPokemon1Id_fkey";

-- DropForeignKey
ALTER TABLE "MatchmakingQueue" DROP CONSTRAINT "MatchmakingQueue_selectedPokemon2Id_fkey";

-- DropForeignKey
ALTER TABLE "MatchmakingQueue" DROP CONSTRAINT "MatchmakingQueue_selectedPokemon3Id_fkey";

-- DropForeignKey
ALTER TABLE "MatchmakingQueue" DROP CONSTRAINT "MatchmakingQueue_userId_fkey";

-- DropTable
DROP TABLE "MatchmakingQueue";

-- CreateTable
CREATE TABLE "MatchQueue" (
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

    CONSTRAINT "MatchQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchQueue_userId_key" ON "MatchQueue"("userId");

-- CreateIndex
CREATE INDEX "MatchQueue_status_userElo_idx" ON "MatchQueue"("status", "userElo");

-- CreateIndex
CREATE INDEX "MatchQueue_userId_idx" ON "MatchQueue"("userId");

-- AddForeignKey
ALTER TABLE "MatchQueue" ADD CONSTRAINT "MatchQueue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchQueue" ADD CONSTRAINT "MatchQueue_selectedPokemon1Id_fkey" FOREIGN KEY ("selectedPokemon1Id") REFERENCES "UserPokemon"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchQueue" ADD CONSTRAINT "MatchQueue_selectedPokemon2Id_fkey" FOREIGN KEY ("selectedPokemon2Id") REFERENCES "UserPokemon"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchQueue" ADD CONSTRAINT "MatchQueue_selectedPokemon3Id_fkey" FOREIGN KEY ("selectedPokemon3Id") REFERENCES "UserPokemon"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
