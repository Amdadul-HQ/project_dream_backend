import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/lib/prisma/prisma.service';
import { PostStatus, Prisma } from '@prisma/client';
import { GetAllPostsDto } from '../dto/getPost.dto';

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all posts by a specific writer with filters and pagination
   */
  async getMyAllPosts(writerId: string, query: GetAllPostsDto) {
    const {
      page = 1,
      limit = 10,
      status,
      seriesId,
      categoryId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const take = Math.min(limit, 50); // Max 50 posts per page

    // Build where clause
    const where: Prisma.PostWhereInput = {
      authorId: writerId,
      ...(status && { status }),
      ...(seriesId && { seriesId }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { excerpt: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(categoryId && {
        categories: {
          some: {
            categoryId,
          },
        },
      }),
    };

    // Build order by clause
    const orderBy: Prisma.PostOrderByWithRelationInput = {};
    switch (sortBy) {
      case 'title':
        orderBy.title = sortOrder;
        break;
      case 'publishedAt':
        orderBy.publishedAt = sortOrder;
        break;
      case 'viewsCount':
        orderBy.viewsCount = sortOrder;
        break;
      case 'likeCount':
        orderBy.likeCount = sortOrder;
        break;
      default:
        orderBy.createdAt = sortOrder;
    }

    // Get posts and total count
    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              username: true,
              name: true,
              profile: true,
              isVerified: true,
            },
          },
          series: {
            select: {
              id: true,
              name: true,
              slug: true,
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
          _count: {
            select: {
              likes: true,
              comments: true,
              saves: true,
            },
          },
        },
        skip,
        take,
        orderBy,
      }),
      this.prisma.post.count({ where }),
    ]);

    const totalPages = Math.ceil(total / take);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data: posts.map((post) => ({
        ...post,
        categories: post.categories.map((pc) => pc.category),
        tags: post.tags.map((pt) => pt.tag),
        stats: {
          likes: post._count.likes,
          comments: post._count.comments,
          saves: post._count.saves,
          views: post.viewsCount,
        },
      })),
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: take,
        hasNext,
        hasPrev,
      },
    };
  }

  /**
   * Get a specific post by ID (only if owned by the writer)
   */
  async getPostById(postId: string, writerId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            name: true,
            profile: true,
            isVerified: true,
          },
        },
        series: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
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
                description: true,
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
        comments: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                profile: true,
                isVerified: true,
              },
            },
            replies: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    name: true,
                    profile: true,
                    isVerified: true,
                  },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          where: { parentId: null },
          orderBy: { createdAt: 'desc' },
          take: 10,
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

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== writerId) {
      throw new ForbiddenException('You can only access your own posts');
    }

    return {
      ...post,
      categories: post.categories.map((pc) => pc.category),
      tags: post.tags.map((pt) => pt.tag),
      stats: {
        likes: post._count.likes,
        comments: post._count.comments,
        saves: post._count.saves,
        views: post.viewsCount,
      },
    };
  }

  /**
   * Get posts by series for a specific writer
   */
  async getPostsBySeries(
    seriesId: string,
    writerId: string,
    query: GetAllPostsDto,
  ) {
    const { page = 1, limit = 10, sortOrder = 'asc' } = query;
    const skip = (page - 1) * limit;
    const take = Math.min(limit, 50);

    // Verify series exists and get basic info
    const series = await this.prisma.series.findUnique({
      where: { id: seriesId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        thumbnail: true,
        postsCount: true,
      },
    });

    if (!series) {
      throw new NotFoundException('Series not found');
    }

    // Get posts in the series by this writer
    const where: Prisma.PostWhereInput = {
      seriesId,
      authorId: writerId,
    };

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              username: true,
              name: true,
              profile: true,
              isVerified: true,
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
          _count: {
            select: {
              likes: true,
              comments: true,
              saves: true,
            },
          },
        },
        skip,
        take,
        orderBy: { seriesOrder: sortOrder },
      }),
      this.prisma.post.count({ where }),
    ]);

    const totalPages = Math.ceil(total / take);

    return {
      series,
      posts: posts.map((post) => ({
        ...post,
        categories: post.categories.map((pc) => pc.category),
        tags: post.tags.map((pt) => pt.tag),
        stats: {
          likes: post._count.likes,
          comments: post._count.comments,
          saves: post._count.saves,
          views: post.viewsCount,
        },
      })),
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: take,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get writer statistics overview
   */
  async getWriterStats(writerId: string) {
    // Get user stats
    const userStats = await this.prisma.userStats.findUnique({
      where: { userId: writerId },
    });

    // Get recent posts performance
    const recentPosts = await this.prisma.post.findMany({
      where: {
        authorId: writerId,
        status: PostStatus.PUBLISHED,
      },
      select: {
        id: true,
        title: true,
        viewsCount: true,
        likeCount: true,
        commentCount: true,
        publishedAt: true,
      },
      orderBy: { publishedAt: 'desc' },
      take: 5,
    });

    // Get monthly stats for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyStats = await this.prisma.userMonthlyStats.findMany({
      where: {
        userId: writerId,
        OR: [
          {
            year: { gte: sixMonthsAgo.getFullYear() },
            month: { gte: sixMonthsAgo.getMonth() + 1 },
          },
          {
            year: { gt: sixMonthsAgo.getFullYear() },
          },
        ],
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 6,
    });

    // Get top performing posts
    const topPosts = await this.prisma.post.findMany({
      where: {
        authorId: writerId,
        status: PostStatus.PUBLISHED,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        viewsCount: true,
        likeCount: true,
        commentCount: true,
        publishedAt: true,
      },
      orderBy: [{ viewsCount: 'desc' }, { likeCount: 'desc' }],
      take: 5,
    });

    return {
      overview: {
        totalPosts: userStats?.totalPosts || 0,
        totalViews: userStats?.totalViews || 0,
        totalLikes: userStats?.totalLikes || 0,
        totalComments: userStats?.totalComments || 0,
        totalFollowers: userStats?.totalFollowers || 0,
        engagementRate: userStats?.engagementRate || 0,
        avgViewsPerPost: userStats?.avgViewsPerPost || 0,
      },
      recentPosts,
      monthlyStats: monthlyStats.reverse(), // Show oldest to newest
      topPosts,
    };
  }
}
