import { Injectable, NotFoundException } from '@nestjs/common';
import { Post } from '@prisma/client';
import { PostFeedQueryDto } from '../dto/postFeedQuery.dto';
import { PrismaService } from 'src/lib/prisma/prisma.service';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  private readonly PAGE_SIZE = 10;

  async getPostsFeed(query: PostFeedQueryDto, userId?: string) {
    const { categoryId, feedType, cursor, pageSize } = query;
    const take = pageSize || this.PAGE_SIZE;

    let posts: Post[];
    let whereClause: any = { status: 'PUBLISHED' };

    if (categoryId) {
      whereClause = {
        ...whereClause,
        categories: { some: { id: categoryId } },
      };
    }

    const commonFindManyArgs = {
      where: whereClause,
      take: take + 1, // Fetch one extra to determine if there's a next page
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0, // Skip the cursor itself
      orderBy: { createdAt: 'desc' as const },
    };

    switch (feedType) {
      case 'trending': {
        // Trending logic: Order by a combination of likes, comments, views, etc.
        // A simple implementation could be by recent popularity score.
        // For simplicity here, we'll order by viewsCount for now.
        posts = await this.prisma.post.findMany({
          ...commonFindManyArgs,
          orderBy: { viewsCount: 'desc' },
        });
        break;
      }
      case 'following': {
        if (!userId) {
          throw new NotFoundException(
            'You must be logged in to view following posts.',
          );
        }
        // Get IDs of users the current user is following
        const followingUsers = await this.prisma.follow.findMany({
          where: { followerId: userId },
          select: { followeeId: true },
        });
        const followingIds = followingUsers.map((f) => f.followeeId);

        posts = await this.prisma.post.findMany({
          ...commonFindManyArgs,
          where: {
            ...whereClause,
            writerId: { in: followingIds },
          },
        });
        break;
      }
      case 'liked': {
        if (!userId) {
          throw new NotFoundException(
            'You must be logged in to view liked posts.',
          );
        }
        posts = await this.prisma.post.findMany({
          ...commonFindManyArgs,
          where: {
            ...whereClause,
            like: { some: { id: userId } },
          },
        });
        break;
      }
      case 'topPicks': {
        // Top Picks logic: A more sophisticated algorithm, maybe based on views and creation date.
        posts = await this.prisma.post.findMany({
          ...commonFindManyArgs,
          orderBy: { likeCount: 'desc' }, // Simple implementation, sort by likes
        });
        break;
      }
      case 'recent':
      default: {
        posts = await this.prisma.post.findMany(commonFindManyArgs);
        break;
      }
    }

    const hasNextPage = posts.length > take;
    const paginatedPosts = hasNextPage ? posts.slice(0, -1) : posts;
    const nextCursor = hasNextPage
      ? paginatedPosts[paginatedPosts.length - 1].id
      : null;

    return { posts: paginatedPosts, nextCursor };
  }

  async getPostWithViewIncrement(postId: string) {
    // 1. First, check if the post exists and retrieve it.
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        writer: {
          select: {
            name: true,
            email: true,
          },
        },
        categories: true,
        comments: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        like: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found.`);
    }

    // 2. Increment the view count using an atomic update.
    await this.prisma.post.update({
      where: { id: postId },
      data: { viewsCount: { increment: 1 } },
    });

    // 3. Return the original post data.
    return post;
  }
}
