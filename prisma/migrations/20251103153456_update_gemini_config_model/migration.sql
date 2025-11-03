/*
  Warnings:

  - You are about to drop the column `temperature` on the `GeminiConfigModel` table. All the data in the column will be lost.
  - You are about to drop the column `topK` on the `GeminiConfigModel` table. All the data in the column will be lost.
  - You are about to drop the column `topP` on the `GeminiConfigModel` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GeminiConfigModel" DROP COLUMN "temperature",
DROP COLUMN "topK",
DROP COLUMN "topP";
