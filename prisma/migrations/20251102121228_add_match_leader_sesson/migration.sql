/*
  Warnings:

  - The values [MATCHED] on the enum `QueueStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "MatchRoundNumber" AS ENUM ('ONE', 'TWO', 'THREE');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('SELECTING_POKEMON', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RoundResultStatus" AS ENUM ('PENDING', 'COMPLETED');

-- AlterEnum
BEGIN;
CREATE TYPE "QueueStatus_new" AS ENUM ('WAITING');
ALTER TABLE "MatchQueue" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "MatchQueue" ALTER COLUMN "status" TYPE "QueueStatus_new" USING ("status"::text::"QueueStatus_new");
ALTER TYPE "QueueStatus" RENAME TO "QueueStatus_old";
ALTER TYPE "QueueStatus_new" RENAME TO "QueueStatus";
DROP TYPE "QueueStatus_old";
ALTER TABLE "MatchQueue" ALTER COLUMN "status" SET DEFAULT 'WAITING';
COMMIT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "eloscore" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Match" (
    "id" SERIAL NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'PENDING',
    "leaderboardSeasonId" INTEGER NOT NULL,
    "winnerId" INTEGER,
    "eloGained" INTEGER,
    "eloLost" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchParticipant" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "hasAccepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MatchParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchRound" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "roundNumber" "MatchRoundNumber" NOT NULL DEFAULT 'ONE',
    "status" "RoundStatus" NOT NULL DEFAULT 'SELECTING_POKEMON',
    "roundWinnerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MatchRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchRoundParticipant" (
    "id" SERIAL NOT NULL,
    "matchParticipantId" INTEGER NOT NULL,
    "matchRoundId" INTEGER NOT NULL,
    "selectedUserPokemonId" INTEGER,
    "points" INTEGER NOT NULL DEFAULT 0,
    "totalTimeMs" INTEGER NOT NULL DEFAULT 0,
    "questionsTotal" INTEGER NOT NULL DEFAULT 10,
    "status" "RoundResultStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MatchRoundParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardSeason" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" INTEGER,
    "deletedById" INTEGER,
    "updatedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "LeaderboardSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rank" (
    "id" SERIAL NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "minElo" INTEGER NOT NULL,
    "maxElo" INTEGER,
    "iconUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Rank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSeasonHistory" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "finalElo" INTEGER NOT NULL,
    "finalRank" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "UserSeasonHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Match_status_idx" ON "Match"("status");

-- CreateIndex
CREATE INDEX "Match_winnerId_idx" ON "Match"("winnerId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchParticipant_matchId_userId_key" ON "MatchParticipant"("matchId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchRound_matchId_roundNumber_key" ON "MatchRound"("matchId", "roundNumber");

-- CreateIndex
CREATE INDEX "MatchRoundParticipant_selectedUserPokemonId_idx" ON "MatchRoundParticipant"("selectedUserPokemonId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchRoundParticipant_matchParticipantId_matchRoundId_key" ON "MatchRoundParticipant"("matchParticipantId", "matchRoundId");

-- CreateIndex
CREATE INDEX "LeaderboardSeason_isActive_idx" ON "LeaderboardSeason"("isActive");

-- CreateIndex
CREATE INDEX "Rank_seasonId_minElo_idx" ON "Rank"("seasonId", "minElo");

-- CreateIndex
CREATE UNIQUE INDEX "Rank_seasonId_name_key" ON "Rank"("seasonId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "UserSeasonHistory_userId_seasonId_key" ON "UserSeasonHistory"("userId", "seasonId");

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_leaderboardSeasonId_fkey" FOREIGN KEY ("leaderboardSeasonId") REFERENCES "LeaderboardSeason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchRound" ADD CONSTRAINT "MatchRound_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchRound" ADD CONSTRAINT "MatchRound_roundWinnerId_fkey" FOREIGN KEY ("roundWinnerId") REFERENCES "MatchParticipant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "MatchRoundParticipant" ADD CONSTRAINT "MatchRoundParticipant_matchParticipantId_fkey" FOREIGN KEY ("matchParticipantId") REFERENCES "MatchParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchRoundParticipant" ADD CONSTRAINT "MatchRoundParticipant_matchRoundId_fkey" FOREIGN KEY ("matchRoundId") REFERENCES "MatchRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchRoundParticipant" ADD CONSTRAINT "MatchRoundParticipant_selectedUserPokemonId_fkey" FOREIGN KEY ("selectedUserPokemonId") REFERENCES "UserPokemon"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardSeason" ADD CONSTRAINT "LeaderboardSeason_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "LeaderboardSeason" ADD CONSTRAINT "LeaderboardSeason_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "LeaderboardSeason" ADD CONSTRAINT "LeaderboardSeason_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Rank" ADD CONSTRAINT "Rank_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "LeaderboardSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSeasonHistory" ADD CONSTRAINT "UserSeasonHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSeasonHistory" ADD CONSTRAINT "UserSeasonHistory_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "LeaderboardSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;
