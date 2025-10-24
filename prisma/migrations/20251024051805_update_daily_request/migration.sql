-- CreateEnum
CREATE TYPE "DailyRequestType" AS ENUM ('LOGIN', 'EXERCISE', 'LESSON');

-- CreateEnum
CREATE TYPE "DailyRequestCategoryType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "DailyRequest" ADD COLUMN     "dailyRequestType" "DailyRequestType" NOT NULL DEFAULT 'LESSON';

-- AlterTable
ALTER TABLE "DailyRequestCategory" ADD COLUMN     "categoryType" "DailyRequestCategoryType" NOT NULL DEFAULT 'DAILY';

-- DropEnum
DROP TYPE "DailyConditionType";
