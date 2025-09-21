/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/lib/prisma/prisma.service';
import { CreatePostDto } from '../dto/createPost.dto';
import { Post, PostStatus } from '@prisma/client';
import { CloudinaryService } from 'src/lib/cloudinary/cloudinary.service';
import { generateSlug } from '../utils/slugGeneration';

@Injectable()
export class CreatePostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Creates a new post with optional series, categories, tags, and audio.
   */
  async createPost(
    createPostDto: CreatePostDto,
    thumbnailUrl?: string,
    audio?: Express.Multer.File,
    authorId?: string,
  ): Promise<Post> {
    if (!authorId) {
      throw new BadRequestException('Author ID is required');
    }

    // Verify user exists and has writer permissions
    const user = await this.prisma.user.findUnique({
      where: { id: authorId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.role !== 'WRITER' && user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'User does not have permission to create posts',
      );
    }

    const {
      seriesId,
      seriesname,
      categoryIds,
      tagNames,
      title,
      content,
      excerpt,
      metaTitle,
      metaDescription,
      status = PostStatus.DRAFT,
      scheduledAt,
    } = createPostDto;

    // Generate unique slug from title
    let slug = generateSlug(title);
    const existingPost = await this.prisma.post.findUnique({
      where: { slug },
    });

    if (existingPost) {
      slug = `${slug}-${Date.now()}`;
    }

    let postSeriesId: string | undefined;
    let seriesOrder: number | undefined;
    let audioUrl: string | undefined;

    // Handle audio upload if provided
    if (audio) {
      try {
        const audioResult = await this.cloudinaryService.uploadAudioFromBuffer(
          audio.buffer,
          audio.originalname,
        );
        audioUrl = audioResult.url;
      } catch (error) {
        console.error('Error uploading audio:', error);
        throw new BadRequestException('Failed to upload audio file');
      }
    }

    // Wrap in transaction to ensure data consistency
    const createdPost = await this.prisma.$transaction(async (tx) => {
      // Handle series creation or connection
      if (seriesname) {
        if (seriesId) {
          throw new BadRequestException(
            'Cannot provide both a new series name and an existing series ID.',
          );
        }

        // Check if series with this name already exists
        const existingSeries = await tx.series.findUnique({
          where: { name: seriesname },
        });

        if (existingSeries) {
          throw new BadRequestException('Series with this name already exists');
        }

        // Create new series
        const newSeries = await tx.series.create({
          data: {
            name: seriesname,
            slug: generateSlug(seriesname),
          },
        });

        postSeriesId = newSeries.id;
        seriesOrder = 1;

        // Update series posts count
        await tx.series.update({
          where: { id: newSeries.id },
          data: { postsCount: 1 },
        });
      } else if (seriesId) {
        // Verify series exists
        const series = await tx.series.findUnique({
          where: { id: seriesId },
        });

        if (!series) {
          throw new BadRequestException('Series not found');
        }

        // Get the next order number in the series
        const lastPostInSeries = await tx.post.findFirst({
          where: { seriesId },
          orderBy: { seriesOrder: 'desc' },
        });

        seriesOrder = (lastPostInSeries?.seriesOrder ?? 0) + 1;
        postSeriesId = seriesId;

        // Update series posts count
        await tx.series.update({
          where: { id: seriesId },
          data: { postsCount: { increment: 1 } },
        });
      }

      // Verify categories exist
      if (categoryIds && categoryIds.length > 0) {
        const categories = await tx.category.findMany({
          where: { id: { in: categoryIds } },
        });

        if (categories.length !== categoryIds.length) {
          throw new BadRequestException('One or more categories not found');
        }
      }

      // Handle tags - create new ones if they don't exist
      const tagIds: string[] = [];
      if (tagNames && tagNames.length > 0) {
        for (const tagName of tagNames) {
          const tagSlug = generateSlug(tagName);

          // Find or create tag
          let tag = await tx.tag.findUnique({
            where: { name: tagName },
          });

          if (!tag) {
            tag = await tx.tag.create({
              data: {
                name: tagName,
                slug: tagSlug,
                usageCount: 1,
              },
            });
          } else {
            // Increment usage count
            await tx.tag.update({
              where: { id: tag.id },
              data: { usageCount: { increment: 1 } },
            });
          }

          tagIds.push(tag.id);
        }
      }

      // Create the post
      const post = await tx.post.create({
        data: {
          title,
          slug,
          content,
          excerpt: excerpt || title.substring(0, 160) + '...',
          thumbnail: thumbnailUrl,
          audioUrl,
          authorId,
          seriesId: postSeriesId,
          seriesOrder,
          status,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
          metaTitle: metaTitle || title,
          metaDescription:
            metaDescription || excerpt || title.substring(0, 160) + '...',
          publishedAt: status === PostStatus.PUBLISHED ? new Date() : undefined,
        },
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
          series: true,
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
        },
      });

      // Connect categories
      if (categoryIds && categoryIds.length > 0) {
        await tx.postCategory.createMany({
          data: categoryIds.map((categoryId) => ({
            postId: post.id,
            categoryId,
          })),
        });
      }

      // Connect tags
      if (tagIds.length > 0) {
        await tx.postTag.createMany({
          data: tagIds.map((tagId) => ({
            postId: post.id,
            tagId,
          })),
        });
      }

      // Update user stats
      await this.updateUserStats(tx, authorId);

      return post;
    });

    // Create activity record
    await this.createActivity(authorId, 'POST_CREATED', createdPost.id);

    return createdPost;
  }

  /**
   * Update user statistics after creating a post
   */
  private async updateUserStats(tx: any, userId: string) {
    const userStats = await tx.userStats.findUnique({
      where: { userId },
    });

    if (userStats) {
      await tx.userStats.update({
        where: { userId },
        data: {
          totalPosts: { increment: 1 },
        },
      });
    } else {
      await tx.userStats.create({
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

    const monthlyStats = await tx.userMonthlyStats.findUnique({
      where: {
        userId_year_month: {
          userId,
          year,
          month,
        },
      },
    });

    if (monthlyStats) {
      await tx.userMonthlyStats.update({
        where: {
          userId_year_month: {
            userId,
            year,
            month,
          },
        },
        data: {
          postsCount: { increment: 1 },
        },
      });
    } else {
      await tx.userMonthlyStats.create({
        data: {
          userId,
          year,
          month,
          postsCount: 1,
        },
      });
    }
  }

  /**
   * Create activity record
   */
  private async createActivity(userId: string, type: string, targetId: string) {
    await this.prisma.recentActivity.create({
      data: {
        userId,
        type: type as any,
        description: `Created a new post`,
        targetId,
        targetType: 'POST',
      },
    });
  }
}
