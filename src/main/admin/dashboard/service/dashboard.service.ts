import { Injectable, NotFoundException } from '@nestjs/common';
import { DashboardStatsDto } from '../dto/dashboardStats.dto';
import { PrismaService } from '@project/lib/prisma/prisma.service';
import { successResponse } from '@project/common/utils/response.util';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}
  async getDashboardStats(): Promise<DashboardStatsDto> {
    const totalUsers = await this.prisma.user.count();
    const totalPosts = await this.prisma.post.count();
    const totalLikes = await this.prisma.post
      .aggregate({ _sum: { likeCount: true } })
      .then((result) => result._sum.likeCount || 0);
    const totalComments = await this.prisma.comment.count();
    const totalViews = await this.prisma.post
      .aggregate({ _sum: { viewsCount: true } })
      .then((result) => result._sum.viewsCount || 0);

    // Fetch data for user growth (last 30 days)
    const userGrowthData = await this.prisma.user.findMany({
      select: { createdAt: true },
      where: {
        createdAt: {
          gte: new Date(new Date().setDate(new Date().getDate() - 30)),
        },
      },
    });

    // Process user growth data to be chart-friendly
    const userGrowthMap = userGrowthData.reduce((acc, user) => {
      const date = user.createdAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});
    const userGrowth = Object.keys(userGrowthMap).map((date) => ({
      date,
      count: userGrowthMap[date],
    }));

    // Fetch data for post engagement (likes & comments) over the last 30 days
    const postEngagementData = await this.prisma.post.findMany({
      select: {
        createdAt: true,
        likeCount: true,
        commentCount: true,
        viewsCount: true,
      },
      where: {
        createdAt: {
          gte: new Date(new Date().setDate(new Date().getDate() - 30)),
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Process post engagement data
    const postEngagementMap = postEngagementData.reduce((acc, post) => {
      const date = post.createdAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { likes: 0, comments: 0, views: 0 };
      }
      acc[date].likes += post.likeCount;
      acc[date].comments += post.commentCount;
      acc[date].views += post.viewsCount;
      return acc;
    }, {});
    const postEngagement = Object.keys(postEngagementMap).map((date) => ({
      date,
      likes: postEngagementMap[date].likes,
      comments: postEngagementMap[date].comments,
      views: postEngagementMap[date].views,
    }));

    return {
      totalUsers,
      totalPosts,
      totalLikes,
      totalComments,
      totalViews,
      userGrowth,
      postEngagement,
    };
  }

  async getPostDetails(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        title: true,
        createdAt: true,
        likeCount: true,
        commentCount: true,
        viewsCount: true,
        writer: {
          select: { name: true, email: true },
        },
        comments: {
          select: {
            id: true,
            comment: true,
            user: {
              select: { name: true },
            },
          },
        },
        like: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found.`);
    }

    return successResponse(post, 'Post Details Fetched successfull');
  }

  async getUserDetails(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        posts: {
          select: {
            id: true,
            title: true,
            createdAt: true,
            likeCount: true,
            commentCount: true,
            viewsCount: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    return successResponse(user, 'User Details Fetched Successfull');
  }
}
