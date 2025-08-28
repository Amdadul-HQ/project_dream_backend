/*
  Warnings:

  - You are about to drop the column `faceBook` on the `UserSocialMedia` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "UserSocialMedia" DROP COLUMN "faceBook",
ADD COLUMN     "facebook" TEXT;
