-- CreateEnum
CREATE TYPE "RoleSpeaking" AS ENUM ('A', 'B');

-- AlterTable
ALTER TABLE "QuestionBank" ADD COLUMN     "role" "RoleSpeaking";
