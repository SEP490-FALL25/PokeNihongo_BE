/*
  Warnings:

  - The values [LOGIN,EXERCISE,LESSON] on the enum `DailyRequestType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `dailyRequestCategoryId` on the `DailyRequest` table. All the data in the column will be lost.
  - You are about to drop the `DailyRequestCategory` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DailyRequestType_new" AS ENUM ('DAILY_LOGIN', 'DAILY_LESSON', 'DAILY_EXERCISE', 'STREAK_LOGIN', 'STREAK_LESSON', 'STREAK_EXCERCISE');
ALTER TABLE "DailyRequest" ALTER COLUMN "dailyRequestType" DROP DEFAULT;
ALTER TABLE "DailyRequest" ALTER COLUMN "dailyRequestType" TYPE "DailyRequestType_new" USING ("dailyRequestType"::text::"DailyRequestType_new");
ALTER TYPE "DailyRequestType" RENAME TO "DailyRequestType_old";
ALTER TYPE "DailyRequestType_new" RENAME TO "DailyRequestType";
DROP TYPE "DailyRequestType_old";
ALTER TABLE "DailyRequest" ALTER COLUMN "dailyRequestType" SET DEFAULT 'DAILY_LESSON';
COMMIT;

-- DropForeignKey
ALTER TABLE "DailyRequest" DROP CONSTRAINT "DailyRequest_dailyRequestCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "DailyRequestCategory" DROP CONSTRAINT "DailyRequestCategory_createdById_fkey";

-- DropForeignKey
ALTER TABLE "DailyRequestCategory" DROP CONSTRAINT "DailyRequestCategory_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "DailyRequestCategory" DROP CONSTRAINT "DailyRequestCategory_updatedById_fkey";

-- AlterTable
ALTER TABLE "DailyRequest" DROP COLUMN "dailyRequestCategoryId",
ADD COLUMN     "isStreak" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "dailyRequestType" SET DEFAULT 'DAILY_LESSON';

-- DropTable
DROP TABLE "DailyRequestCategory";
