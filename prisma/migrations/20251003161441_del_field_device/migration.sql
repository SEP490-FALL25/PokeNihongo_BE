/*
  Warnings:

  - You are about to drop the column `deviceToken` on the `Device` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Device_deviceToken_key";

-- AlterTable
ALTER TABLE "Device" DROP COLUMN "deviceToken";
