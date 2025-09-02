-- AlterTable
ALTER TABLE "public"."Post" ADD COLUMN     "tags" TEXT[];

-- CreateTable
CREATE TABLE "public"."UserOverview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalFollowers" INTEGER NOT NULL DEFAULT 0,
    "totalPosts" INTEGER NOT NULL DEFAULT 0,
    "totalViews" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "followerGrowth" DOUBLE PRECISION,
    "postGrowth" DOUBLE PRECISION,
    "viewGrowth" DOUBLE PRECISION,
    "engagementGrowth" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserOverview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserOverview_userId_key" ON "public"."UserOverview"("userId");

-- AddForeignKey
ALTER TABLE "public"."UserOverview" ADD CONSTRAINT "UserOverview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
