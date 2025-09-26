/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
// posts.service.ts
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
        categories: { some: { categoryId: categoryId } }, // Fixed relation field
      };
    }

    const commonFindManyArgs = {
      where: whereClause,
      take: take + 1, // Fetch one extra to determine if there's a next page
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0, // Skip the cursor itself
      orderBy: { createdAt: 'desc' as const },
      include: {
        author: {
          // Fixed field name from 'writer' to 'author'
          select: {
            id: true,
            name: true,
            username: true,
            profile: true,
          },
        },
        categories: {
          include: {
            category: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        likes: {
          select: {
            userId: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            saves: true,
          },
        },
      },
    };

    switch (feedType) {
      case 'trending': {
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
            authorId: { in: followingIds }, // Fixed field name
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
            likes: { some: { userId: userId } }, // Fixed relation field
          },
        });
        break;
      }
      case 'topPicks': {
        posts = await this.prisma.post.findMany({
          ...commonFindManyArgs,
          orderBy: { likeCount: 'desc' },
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

    return { posts: paginatedPosts, nextCursor, hasNextPage };
  }

  async getPostWithViewIncrement(postId: string) {
    // 1. First, check if the post exists and retrieve it.
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          // Fixed field name
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            profile: true,
          },
        },
        categories: {
          include: {
            category: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                profile: true,
              },
            },
            replies: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    profile: true,
                  },
                },
              },
            },
          },
          where: {
            parentId: null, // Only get top-level comments
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        likes: {
          select: {
            userId: true,
          },
        },
        saves: {
          select: {
            userId: true,
          },
        },
        series: true,
        _count: {
          select: {
            likes: true,
            comments: true,
            saves: true,
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

    // 3. Return the post data with incremented view count.
    return {
      ...post,
      viewsCount: post.viewsCount + 1,
    };
  }
}
