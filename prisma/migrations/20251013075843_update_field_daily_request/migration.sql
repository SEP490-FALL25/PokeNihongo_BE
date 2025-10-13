/*
  Warnings:

  - Made the column `conditionValue` on table `DailyRequest` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "DailyRequest" ALTER COLUMN "conditionValue" SET NOT NULL;
