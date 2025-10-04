/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/lib/prisma/prisma.service';
import { CreatePostDto } from '../dto/create-post.dto';
import { Post, PostStatus } from '@prisma/client';

@Injectable()
export class CreatePostService {
  constructor(private readonly prisma: PrismaService) {}

  async createPost(
    createPostDto: CreatePostDto,
    thumbnail: string,
    audio: string | undefined,
    writerId: string,
  ): Promise<Post> {
    const {
      title,
      content,
      excerpt,
      categoryIds,
      tags,
      seriesname,
      seriesId,
      seriesOrder,
      status,
      metaTitle,
      metaDescription,
      scheduledAt,
    } = createPostDto;

    // Validate that both seriesname and seriesId are not provided together
    if (seriesname && seriesId) {
      throw new BadRequestException(
        'Cannot provide both seriesname and seriesId. Choose one.',
      );
    }

    // Validate categories exist
    const categories = await this.prisma.category.findMany({
      where: {
        id: {
          in: categoryIds,
        },
      },
    });

    if (categories.length !== categoryIds.length) {
      throw new NotFoundException('One or more category IDs do not exist');
    }

    // Handle series logic
    let finalSeriesId: string | undefined = seriesId;

    if (seriesname) {
      // Check if series with this name already exists
      const existingSeries = await this.prisma.series.findUnique({
        where: { name: seriesname },
      });

      if (existingSeries) {
        throw new BadRequestException(
          `Series with name "${seriesname}" already exists. Use seriesId instead.`,
        );
      }

      // Create new series
      const slug = this.generateSlug(seriesname);
      const newSeries = await this.prisma.series.create({
        data: {
          name: seriesname,
          authorId: writerId,
          slug,
          postsCount: 1,
        },
      });

      finalSeriesId = newSeries.id;
    } else if (finalSeriesId) {
      // Verify series exists and increment posts count
      const existingSeries = await this.prisma.series.findUnique({
        where: { id: finalSeriesId },
      });

      if (!existingSeries) {
        throw new NotFoundException(
          `Series with ID "${finalSeriesId}" not found`,
        );
      }

      // Increment series post count
      await this.prisma.series.update({
        where: { id: finalSeriesId },
        data: {
          postsCount: {
            increment: 1,
          },
        },
      });
    }

    // Generate slug from title
    const slug = await this.generateUniqueSlug(title);

    // Handle tags - find or create
    const tagIds: string[] = [];
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        const tagSlug = this.generateSlug(tagName);

        // Find or create tag
        const tag = await this.prisma.tag.upsert({
          where: { slug: tagSlug },
          update: {
            usageCount: {
              increment: 1,
            },
          },
          create: {
            name: tagName,
            slug: tagSlug,
            usageCount: 1,
          },
        });

        tagIds.push(tag.id);
      }
    }

    // Set publishedAt if status is PUBLISHED
    const publishedAt = status === PostStatus.PUBLISHED ? new Date() : null;

    // Create the post with all relations
    const post = await this.prisma.post.create({
      data: {
        title,
        slug,
        content,
        excerpt,
        thumbnail,
        audioUrl: audio,
        authorId: writerId,
        seriesId: finalSeriesId,
        seriesOrder,
        status,
        publishedAt,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        metaTitle: metaTitle || title,
        metaDescription: metaDescription || excerpt,
        // Create category relations
        categories: {
          create: categoryIds.map((categoryId) => ({
            categoryId,
          })),
        },
        // Create tag relations
        tags: {
          create: tagIds.map((tagId) => ({
            tagId,
          })),
        },
      },
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
            category: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        series: true,
      },
    });

    // Update user stats
    await this.updateUserStats(writerId);

    // Create activity log
    await this.createActivityLog(writerId, post.id, status);

    // Create notification if published
    if (status === PostStatus.PUBLISHED) {
      await this.notifyFollowers(writerId, post.id);
    }

    return post;
  }

  /**
   * Generate a URL-friendly slug from text
   */
  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Generate a unique slug for the post
   */
  private async generateUniqueSlug(title: string): Promise<string> {
    const slug = this.generateSlug(title);
    let counter = 1;
    let uniqueSlug = slug;

    // Check if slug exists, if so, append number
    while (await this.prisma.post.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    return uniqueSlug;
  }

  /**
   * Update user statistics after post creation
   */
  private async updateUserStats(userId: string): Promise<void> {
    const userStats = await this.prisma.userStats.findUnique({
      where: { userId },
    });

    if (userStats) {
      await this.prisma.userStats.update({
        where: { userId },
        data: {
          totalPosts: {
            increment: 1,
          },
        },
      });
    } else {
      // Create user stats if doesn't exist
      await this.prisma.userStats.create({
        data: {
          userId,
          totalPosts: 1,
        },
      });
    }

    // Update monthly stats
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    await this.prisma.userMonthlyStats.upsert({
      where: {
        userId_year_month: {
          userId,
          year,
          month,
        },
      },
      update: {
        postsCount: {
          increment: 1,
        },
      },
      create: {
        userId,
        year,
        month,
        postsCount: 1,
      },
    });
  }

  /**
   * Create activity log for post creation
   */
  private async createActivityLog(
    userId: string,
    postId: string,
    status: PostStatus,
  ): Promise<void> {
    const activityType =
      status === PostStatus.PUBLISHED ? 'POST_PUBLISHED' : 'POST_CREATED';

    await this.prisma.recentActivity.create({
      data: {
        type: activityType,
        description:
          status === PostStatus.PUBLISHED
            ? 'Published a new post'
            : 'Created a new post',
        userId,
        targetId: postId,
        targetType: 'POST',
        metadata: {
          status,
        },
      },
    });
  }

  /**
   * Notify followers when a post is published
   */
  private async notifyFollowers(
    authorId: string,
    postId: string,
  ): Promise<void> {
    // Get all followers
    const followers = await this.prisma.follow.findMany({
      where: {
        followeeId: authorId,
      },
      select: {
        followerId: true,
      },
    });

    // Get post details for notification
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: {
        title: true,
        author: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!post) return;

    // Create notifications for all followers
    const notifications = followers.map((follower) => ({
      type: 'POST_PUBLISHED' as const,
      title: 'New Post Published',
      content: `${post.author.name} published a new post: "${post.title}"`,
      senderId: authorId,
      receiverId: follower.followerId,
      postId,
    }));

    if (notifications.length > 0) {
      await this.prisma.notification.createMany({
        data: notifications,
      });
    }
  }
}
