/*
  Warnings:

  - You are about to drop the column `startTimeSelected` on the `MatchRoundParticipant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MatchRound" ADD COLUMN     "endTimeRound" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "MatchRoundParticipant" DROP COLUMN "startTimeSelected",
ADD COLUMN     "endTimeSelected" TIMESTAMP(3);
