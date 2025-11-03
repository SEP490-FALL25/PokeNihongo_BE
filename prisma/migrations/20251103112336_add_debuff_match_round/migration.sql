-- CreateEnum
CREATE TYPE "MatchDebuffType" AS ENUM ('ADD_QUESTION', 'DECREASE_POINT', 'DISCOMFORT_VISION');

-- AlterTable
ALTER TABLE "MatchRoundParticipant" ADD COLUMN     "debuffId" INTEGER,
ADD COLUMN     "startTimeSelected" TIMESTAMP(3),
ALTER COLUMN "points" DROP NOT NULL,
ALTER COLUMN "points" DROP DEFAULT,
ALTER COLUMN "totalTimeMs" DROP NOT NULL,
ALTER COLUMN "totalTimeMs" DROP DEFAULT;

-- CreateTable
CREATE TABLE "DebuffMatchRoundParticipant" (
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

    CONSTRAINT "DebuffMatchRoundParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DebuffMatchRoundParticipant_nameKey_key" ON "DebuffMatchRoundParticipant"("nameKey");

-- AddForeignKey
ALTER TABLE "MatchRoundParticipant" ADD CONSTRAINT "MatchRoundParticipant_debuffId_fkey" FOREIGN KEY ("debuffId") REFERENCES "DebuffMatchRoundParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebuffMatchRoundParticipant" ADD CONSTRAINT "DebuffMatchRoundParticipant_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DebuffMatchRoundParticipant" ADD CONSTRAINT "DebuffMatchRoundParticipant_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DebuffMatchRoundParticipant" ADD CONSTRAINT "DebuffMatchRoundParticipant_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
