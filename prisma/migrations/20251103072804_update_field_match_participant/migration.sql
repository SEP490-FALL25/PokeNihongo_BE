-- AlterTable
ALTER TABLE "MatchParticipant" ALTER COLUMN "hasAccepted" DROP NOT NULL,
ALTER COLUMN "hasAccepted" DROP DEFAULT;
