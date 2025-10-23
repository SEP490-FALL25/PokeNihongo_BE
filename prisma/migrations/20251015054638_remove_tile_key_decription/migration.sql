/*
  Warnings:

  - You are about to drop the column `descriptionKey` on the `Question_Bank` table. All the data in the column will be lost.
  - You are about to drop the column `titleKey` on the `Question_Bank` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Question_Bank_titleKey_idx";

-- AlterTable
ALTER TABLE "Question_Bank" DROP COLUMN "descriptionKey",
DROP COLUMN "titleKey";
