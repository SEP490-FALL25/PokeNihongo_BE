/*
  Warnings:

  - You are about to drop the `VerificationCode` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[deviceToken]` on the table `Device` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `deviceToken` to the `Device` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "deviceToken" TEXT NOT NULL;

-- DropTable
DROP TABLE "VerificationCode";

-- CreateIndex
CREATE UNIQUE INDEX "Device_deviceToken_key" ON "Device"("deviceToken");
