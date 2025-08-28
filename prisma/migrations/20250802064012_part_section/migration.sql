/*
  Warnings:

  - A unique constraint covering the columns `[part]` on the table `Post` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "part" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Post_part_key" ON "Post"("part");
