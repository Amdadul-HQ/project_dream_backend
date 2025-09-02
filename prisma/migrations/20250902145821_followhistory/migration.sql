-- CreateEnum
CREATE TYPE "public"."FollowAction" AS ENUM ('FOLLOW', 'UNFOLLOW');

-- CreateTable
CREATE TABLE "public"."FollowHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "action" "public"."FollowAction" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserGrowthStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "followersCount" INTEGER NOT NULL,
    "followingCount" INTEGER NOT NULL,
    "postsCount" INTEGER NOT NULL,
    "likesCount" INTEGER NOT NULL,
    "commentsCount" INTEGER NOT NULL,
    "viewsCount" INTEGER NOT NULL,
    "followerRatio" DOUBLE PRECISION,
    "growthRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserGrowthStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FollowHistory_userId_createdAt_idx" ON "public"."FollowHistory"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "FollowHistory_followerId_createdAt_idx" ON "public"."FollowHistory"("followerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserGrowthStats_userId_date_key" ON "public"."UserGrowthStats"("userId", "date");

-- AddForeignKey
ALTER TABLE "public"."FollowHistory" ADD CONSTRAINT "FollowHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FollowHistory" ADD CONSTRAINT "FollowHistory_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserGrowthStats" ADD CONSTRAINT "UserGrowthStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
