-- CreateEnum
CREATE TYPE "LeaderboardStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED', 'PREVIEW');

-- AlterTable
ALTER TABLE "LeaderboardSeason" ADD COLUMN     "enablePrecreate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isRandomItemAgain" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "precreateBeforeEndDays" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "status" "LeaderboardStatus" NOT NULL DEFAULT 'PREVIEW';
