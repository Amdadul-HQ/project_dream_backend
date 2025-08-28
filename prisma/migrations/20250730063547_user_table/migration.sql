/*
  Warnings:

  - You are about to drop the column `socialMediaId` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "socialMediaId";

-- AlterTable
ALTER TABLE "UserSocialMedia" ADD COLUMN     "linkedin" TEXT,
ADD COLUMN     "tiktok" TEXT;
