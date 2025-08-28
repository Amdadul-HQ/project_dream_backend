/*
  Warnings:

  - You are about to drop the column `categoryid` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `seriesid` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `categoryid` on the `Series` table. All the data in the column will be lost.
  - You are about to drop the column `postId` on the `Series` table. All the data in the column will be lost.
  - You are about to drop the `_CategoryToSeries` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_seriesid_fkey";

-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_userId_fkey";

-- DropForeignKey
ALTER TABLE "_CategoryToSeries" DROP CONSTRAINT "_CategoryToSeries_A_fkey";

-- DropForeignKey
ALTER TABLE "_CategoryToSeries" DROP CONSTRAINT "_CategoryToSeries_B_fkey";

-- DropIndex
DROP INDEX "Post_seriesid_key";

-- DropIndex
DROP INDEX "Post_userId_key";

-- DropIndex
DROP INDEX "Series_postId_key";

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "categoryid",
DROP COLUMN "seriesid",
DROP COLUMN "userId",
ADD COLUMN     "seriesId" TEXT,
ADD COLUMN     "writerId" TEXT;

-- AlterTable
ALTER TABLE "Series" DROP COLUMN "categoryid",
DROP COLUMN "postId";

-- DropTable
DROP TABLE "_CategoryToSeries";

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_writerId_fkey" FOREIGN KEY ("writerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
