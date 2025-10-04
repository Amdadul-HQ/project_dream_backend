// services/get-posts.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/lib/prisma/prisma.service';
import { Prisma, PostStatus } from '@prisma/client';
import { GetPostsDto, PostSortBy } from '../dto/get-post.dto';

@Injectable()
export class GetPostsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPosts(dto: GetPostsDto, userId?: string) {
    const {
      page = 1,
      limit = 10,
      sortBy = PostSortBy.RECENT,
      category,
      categories,
      tag,
      seriesId,
      authorId,
      search,
    } = dto;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.PostWhereInput = {
      status: PostStatus.PUBLISHED,
    };

    // Category filter
    if (category) {
      where.categories = {
        some: {
          category: {
            OR: [{ slug: category }, { id: category }],
          },
        },
      };
    }

    // Multiple categories filter
    if (categories && categories.length > 0) {
      where.categories = {
        some: {
          category: {
            slug: { in: categories },
          },
        },
      };
    }

    // Tag filter
    if (tag) {
      where.tags = {
        some: {
          tag: {
            slug: tag,
          },
        },
      };
    }

    // Series filter
    if (seriesId) {
      where.seriesId = seriesId;
    }

    // Author filter
    if (authorId) {
      where.authorId = authorId;
    }

    // Search filter
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Following filter - only show posts from users the current user follows
    if (sortBy === PostSortBy.FOLLOWING && userId) {
      const following = await this.prisma.follow.findMany({
        where: { followerId: userId },
        select: { followeeId: true },
      });

      const followingIds = following.map((f) => f.followeeId);

      if (followingIds.length === 0) {
        // If not following anyone, return empty result
        return {
          success: true,
          data: {
            posts: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
              hasNext: false,
              hasPrevious: false,
            },
          },
          message: 'Posts retrieved successfully',
        };
      }

      where.authorId = { in: followingIds };
    }

    // Liked filter - only show posts the current user has liked
    if (sortBy === PostSortBy.LIKED && userId) {
      const likedPosts = await this.prisma.postLike.findMany({
        where: { userId },
        select: { postId: true },
      });

      const likedPostIds = likedPosts.map((l) => l.postId);

      if (likedPostIds.length === 0) {
        return {
          success: true,
          data: {
            posts: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
              hasNext: false,
              hasPrevious: false,
            },
          },
          message: 'Posts retrieved successfully',
        };
      }

      where.id = { in: likedPostIds };
    }

    // Build orderBy clause based on sortBy
    let orderBy:
      | Prisma.PostOrderByWithRelationInput
      | Prisma.PostOrderByWithRelationInput[] = {};

    switch (sortBy) {
      case PostSortBy.RECENT:
        orderBy = { publishedAt: 'desc' };
        break;

      case PostSortBy.POPULAR:
        // Sort by views and likes
        orderBy = [
          { viewsCount: 'desc' },
          { likeCount: 'desc' },
          { publishedAt: 'desc' },
        ];
        break;

      case PostSortBy.TOP_RATED:
        // Sort by likes, comments, and shares
        orderBy = [
          { likeCount: 'desc' },
          { commentCount: 'desc' },
          { shareCount: 'desc' },
          { publishedAt: 'desc' },
        ];
        break;

      case PostSortBy.FOLLOWING:
      case PostSortBy.LIKED:
        orderBy = { publishedAt: 'desc' };
        break;

      default:
        orderBy = { publishedAt: 'desc' };
    }

    // Get total count
    const total = await this.prisma.post.count({ where });

    // Get posts with pagination
    const posts = await this.prisma.post.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: true,
            role: true,
          },
        },
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                color: true,
              },
            },
          },
        },
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        series: {
          select: {
            id: true,
            name: true,
            slug: true,
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
    });

    // Add user interaction data if userId is provided
    let postsWithUserData = posts;

    if (userId) {
      const postIds = posts.map((p) => p.id);

      // Get user's likes
      const userLikes = await this.prisma.postLike.findMany({
        where: {
          userId,
          postId: { in: postIds },
        },
        select: { postId: true },
      });

      const likedPostIds = new Set(userLikes.map((l) => l.postId));

      // Get user's saves
      const userSaves = await this.prisma.savedPost.findMany({
        where: {
          userId,
          postId: { in: postIds },
        },
        select: { postId: true },
      });

      const savedPostIds = new Set(userSaves.map((s) => s.postId));

      // Add user interaction flags to posts
      postsWithUserData = posts.map((post) => ({
        ...post,
        isLiked: likedPostIds.has(post.id),
        isSaved: savedPostIds.has(post.id),
      }));
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrevious = page > 1;

    return {
      success: true,
      data: {
        posts: postsWithUserData,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext,
          hasPrevious,
        },
      },
      message: 'Posts retrieved successfully',
    };
  }

  /**
   * Get trending posts (most viewed/liked in last 7 days)
   */
  async getTrendingPosts(limit: number = 10) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const posts = await this.prisma.post.findMany({
      where: {
        status: PostStatus.PUBLISHED,
        publishedAt: {
          gte: sevenDaysAgo,
        },
      },
      orderBy: [{ viewsCount: 'desc' }, { likeCount: 'desc' }],
      take: limit,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            profile: true,
          },
        },
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                color: true,
              },
            },
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    return {
      success: true,
      data: { posts },
      message: 'Trending posts retrieved successfully',
    };
  }

  /**
   * Get posts by specific category
   */
  async getPostsByCategory(
    categorySlug: string,
    page: number = 1,
    limit: number = 10,
    userId?: string,
  ) {
    return this.getPosts(
      {
        page,
        limit,
        category: categorySlug,
        sortBy: PostSortBy.RECENT,
      },
      userId,
    );
  }

  /**
   * Get posts from followed users
   */
  async getFollowingPosts(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    return this.getPosts(
      {
        page,
        limit,
        sortBy: PostSortBy.FOLLOWING,
      },
      userId,
    );
  }

  /**
   * Get liked posts by user
   */
  async getLikedPosts(userId: string, page: number = 1, limit: number = 10) {
    return this.getPosts(
      {
        page,
        limit,
        sortBy: PostSortBy.LIKED,
      },
      userId,
    );
  }
}
