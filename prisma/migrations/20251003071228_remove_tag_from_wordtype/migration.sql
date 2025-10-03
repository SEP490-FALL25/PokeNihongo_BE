/*
  Warnings:

  - You are about to drop the column `tag` on the `WordType` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "WordType_tag_idx";

-- AlterTable
ALTER TABLE "WordType" DROP COLUMN "tag";
