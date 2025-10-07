/*
  Warnings:

  - Added the required column `titleJp` to the `Lesson` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "titleJp" VARCHAR(500) NOT NULL;
