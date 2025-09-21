/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/lib/prisma/prisma.service';
import { UpdatePostDto } from '../dto/updatePost.dto';
import { Post, PostStatus } from '@prisma/client';
import { CloudinaryService } from 'src/lib/cloudinary/cloudinary.service';
import { generateSlug } from '../utils/slugGeneration';

@Injectable()
export class UpdatePostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Updates an existing post
   */
  async updatePost(
    postId: string,
    updatePostDto: UpdatePostDto,
    thumbnailUrl?: string,
    audio?: Express.Multer.File,
    authorId?: string,
  ): Promise<Post> {
    if (!authorId) {
      throw new BadRequestException('Author ID is required');
    }

    // Find the existing post and verify ownership
    const existingPost = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: true,
        series: true,
        categories: {
          include: { category: true },
        },
        tags: {
          include: { tag: true },
        },
      },
    });

    if (!existingPost) {
      throw new NotFoundException('Post not found');
    }

    if (existingPost.authorId !== authorId) {
      throw new ForbiddenException('You can only update your own posts');
    }

    const {
      title,
      content,
      excerpt,
      categoryIds,
      tagNames,
      seriesId,
      seriesname,
      status,
      metaTitle,
      metaDescription,
      scheduledAt,
    } = updatePostDto;

    let newSlug: string | undefined;
    let audioUrl: string | undefined;
    let newSeriesId: string | null | undefined = existingPost.seriesId;
    let newSeriesOrder: number | null | undefined = existingPost.seriesOrder;

    // Generate new slug if title changed
    if (title && title !== existingPost.title) {
      newSlug = generateSlug(title);

      // Check if slug already exists (excluding current post)
      const slugExists = await this.prisma.post.findFirst({
        where: {
          slug: newSlug,
          id: { not: postId },
        },
      });

      if (slugExists) {
        newSlug = `${newSlug}-${Date.now()}`;
      }
    }

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

    // Use transaction to ensure data consistency
    const updatedPost = await this.prisma.$transaction(async (tx) => {
      // Handle series changes
      if (seriesname || seriesId !== undefined) {
        // Remove from old series if exists
        if (existingPost.seriesId) {
          await tx.series.update({
            where: { id: existingPost.seriesId },
            data: { postsCount: { decrement: 1 } },
          });
        }

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
            throw new BadRequestException(
              'Series with this name already exists',
            );
          }

          // Create new series
          const newSeries = await tx.series.create({
            data: {
              name: seriesname,
              slug: generateSlug(seriesname),
              postsCount: 1,
            },
          });

          newSeriesId = newSeries.id;
          newSeriesOrder = 1;
        } else if (seriesId) {
          // Verify series exists
          const series = await tx.series.findUnique({
            where: { id: seriesId },
          });

          if (!series) {
            throw new BadRequestException('Series not found');
          }

          // Get next order in series
          const lastPostInSeries = await tx.post.findFirst({
            where: { seriesId },
            orderBy: { seriesOrder: 'desc' },
          });

          newSeriesId = seriesId;
          newSeriesOrder = (lastPostInSeries?.seriesOrder ?? 0) + 1;

          // Update series posts count
          await tx.series.update({
            where: { id: seriesId },
            data: { postsCount: { increment: 1 } },
          });
        } else if (seriesId === null) {
          // Remove from series
          newSeriesId = null;
          newSeriesOrder = null;
        }
      }

      // Handle category updates
      if (categoryIds !== undefined) {
        // Remove existing categories
        await tx.postCategory.deleteMany({
          where: { postId },
        });

        // Add new categories if provided
        if (categoryIds.length > 0) {
          // Verify categories exist
          const categories = await tx.category.findMany({
            where: { id: { in: categoryIds } },
          });

          if (categories.length !== categoryIds.length) {
            throw new BadRequestException('One or more categories not found');
          }

          // Create new category associations
          await tx.postCategory.createMany({
            data: categoryIds.map((categoryId) => ({
              postId,
              categoryId,
            })),
          });
        }
      }

      // Handle tag updates
      if (tagNames !== undefined) {
        // Get current tags and decrement their usage count
        const currentTags = existingPost.tags.map((pt) => pt.tag);
        for (const tag of currentTags) {
          await tx.tag.update({
            where: { id: tag.id },
            data: { usageCount: Math.max(0, tag.usageCount - 1) },
          });
        }

        // Remove existing tags
        await tx.postTag.deleteMany({
          where: { postId },
        });

        // Add new tags if provided
        if (tagNames.length > 0) {
          const tagIds: string[] = [];

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

          // Create new tag associations
          await tx.postTag.createMany({
            data: tagIds.map((tagId) => ({
              postId,
              tagId,
            })),
          });
        }
      }

      // Determine if post should be published now
      let publishedAt = existingPost.publishedAt;
      if (status === PostStatus.PUBLISHED && !existingPost.publishedAt) {
        publishedAt = new Date();
      } else if (status !== PostStatus.PUBLISHED && existingPost.publishedAt) {
        publishedAt = null;
      }

      // Update the post
      const updatedPost = await tx.post.update({
        where: { id: postId },
        data: {
          ...(title && { title }),
          ...(newSlug && { slug: newSlug }),
          ...(content && { content }),
          ...(excerpt !== undefined && { excerpt }),
          ...(thumbnailUrl && { thumbnail: thumbnailUrl }),
          ...(audioUrl && { audioUrl }),
          ...(newSeriesId !== undefined && { seriesId: newSeriesId }),
          ...(newSeriesOrder !== undefined && { seriesOrder: newSeriesOrder }),
          ...(status && { status }),
          ...(metaTitle !== undefined && { metaTitle: metaTitle || title }),
          ...(metaDescription !== undefined && { metaDescription }),
          ...(scheduledAt !== undefined && {
            scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          }),
          publishedAt,
          updatedAt: new Date(),
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

      return updatedPost;
    });

    // Create activity record
    await this.createActivity(authorId, 'POST_UPDATED', postId);

    return updatedPost;
  }

  /**
   * Update post status (publish/unpublish)
   */
  async updatePostStatus(
    postId: string,
    status: PostStatus,
    authorId: string,
  ): Promise<Post> {
    // Verify post exists and user owns it
    const existingPost = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { author: true },
    });

    if (!existingPost) {
      throw new NotFoundException('Post not found');
    }

    if (existingPost.authorId !== authorId) {
      throw new ForbiddenException('You can only update your own posts');
    }

    // Determine publish date
    let publishedAt = existingPost.publishedAt;
    if (status === PostStatus.PUBLISHED && !existingPost.publishedAt) {
      publishedAt = new Date();
    } else if (status !== PostStatus.PUBLISHED && existingPost.publishedAt) {
      publishedAt = null;
    }

    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: {
        status,
        publishedAt,
        updatedAt: new Date(),
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

    // Create activity record
    const activityType =
      status === PostStatus.PUBLISHED ? 'POST_PUBLISHED' : 'POST_UPDATED';
    await this.createActivity(authorId, activityType, postId);

    return updatedPost;
  }

  /**
   * Create activity record
   */
  private async createActivity(userId: string, type: string, targetId: string) {
    const activityDescriptions = {
      POST_UPDATED: 'Updated a post',
      POST_PUBLISHED: 'Published a post',
    };

    await this.prisma.recentActivity.create({
      data: {
        userId,
        type: type as any,
        description: activityDescriptions[type] || 'Updated a post',
        targetId,
        targetType: 'POST',
      },
    });
  }
}
