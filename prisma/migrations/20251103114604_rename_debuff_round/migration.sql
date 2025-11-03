/*
  Warnings:

  - You are about to drop the `DebuffMatchRoundParticipant` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DebuffMatchRoundParticipant" DROP CONSTRAINT "DebuffMatchRoundParticipant_createdById_fkey";

-- DropForeignKey
ALTER TABLE "DebuffMatchRoundParticipant" DROP CONSTRAINT "DebuffMatchRoundParticipant_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "DebuffMatchRoundParticipant" DROP CONSTRAINT "DebuffMatchRoundParticipant_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "MatchRoundParticipant" DROP CONSTRAINT "MatchRoundParticipant_debuffId_fkey";

-- DropTable
DROP TABLE "DebuffMatchRoundParticipant";

-- CreateTable
CREATE TABLE "DebuffRound" (
    "id" SERIAL NOT NULL,
    "nameKey" TEXT NOT NULL,
    "typeDebuff" "MatchDebuffType",
    "valueDebuff" INTEGER NOT NULL,
    "createdById" INTEGER,
    "deletedById" INTEGER,
    "updatedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DebuffRound_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DebuffRound_nameKey_key" ON "DebuffRound"("nameKey");

-- AddForeignKey
ALTER TABLE "MatchRoundParticipant" ADD CONSTRAINT "MatchRoundParticipant_debuffId_fkey" FOREIGN KEY ("debuffId") REFERENCES "DebuffRound"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebuffRound" ADD CONSTRAINT "DebuffRound_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DebuffRound" ADD CONSTRAINT "DebuffRound_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DebuffRound" ADD CONSTRAINT "DebuffRound_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
