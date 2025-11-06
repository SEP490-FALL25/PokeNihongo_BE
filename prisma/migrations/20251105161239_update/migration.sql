/*
  Warnings:

  - You are about to drop the `UserSpeakingAttempt` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "UserSpeakingAttempt" DROP CONSTRAINT "UserSpeakingAttempt_questionBankId_fkey";

-- DropForeignKey
ALTER TABLE "UserSpeakingAttempt" DROP CONSTRAINT "UserSpeakingAttempt_userId_fkey";

-- DropTable
DROP TABLE "UserSpeakingAttempt";
