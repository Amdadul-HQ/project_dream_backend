-- CreateTable
CREATE TABLE "public"."UserContentStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalPosts" INTEGER NOT NULL DEFAULT 0,
    "avgViews" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "avgEngagement" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "topCategoryId" TEXT,
    "topCategoryRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserContentStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserContentStats_userId_key" ON "public"."UserContentStats"("userId");

-- AddForeignKey
ALTER TABLE "public"."UserContentStats" ADD CONSTRAINT "UserContentStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserContentStats" ADD CONSTRAINT "UserContentStats_topCategoryId_fkey" FOREIGN KEY ("topCategoryId") REFERENCES "public"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
