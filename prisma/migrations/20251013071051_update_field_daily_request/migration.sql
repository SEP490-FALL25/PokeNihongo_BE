/*
  Warnings:

  - You are about to drop the column `description` on the `DailyRequest` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `DailyRequest` table. All the data in the column will be lost.
  - Added the required column `descriptionKey` to the `DailyRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nameKey` to the `DailyRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DailyRequest" DROP COLUMN "description",
DROP COLUMN "name",
ADD COLUMN     "descriptionKey" VARCHAR(500) NOT NULL,
ADD COLUMN     "nameKey" VARCHAR(200) NOT NULL;
