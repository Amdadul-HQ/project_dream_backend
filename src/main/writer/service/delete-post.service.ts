/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/lib/prisma/prisma.service';
import { CloudinaryService } from 'src/lib/cloudinary/cloudinary.service';

@Injectable()
export class DeletePostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Delete a post (soft delete by changing status to DELETED)
   */
  async deletePost(writerId: string, postId: string) {
    // Find the post and verify ownership
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        series: true,
        categories: {
          include: { category: true },
        },
        tags: {
          include: { tag: true },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== writerId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    // Use transaction to ensure data consistency
    const result = await this.prisma.$transaction(async (tx) => {
      // Update tag usage counts
      for (const postTag of post.tags) {
        await tx.tag.update({
          where: { id: postTag.tag.id },
          data: {
            usageCount: Math.max(0, postTag.tag.usageCount - 1),
          },
        });
      }

      // Update series posts count if post is in a series
      if (post.seriesId) {
        await tx.series.update({
          where: { id: post.seriesId },
          data: { postsCount: { decrement: 1 } },
        });
      }

      // Soft delete the post (change status to DELETED)
      const deletedPost = await tx.post.update({
        where: { id: postId },
        data: {
          status: 'DELETED',
          updatedAt: new Date(),
        },
      });

      // Update user stats
      await this.updateUserStats(tx, writerId, 'decrement');

      return deletedPost;
    });

    // Create activity record
    await this.createActivity(writerId, 'POST_DELETED', postId);

    return {
      message: 'Post deleted successfully',
      postId: result.id,
    };
  }

  /**
   * Permanently delete a post (hard delete)
   */
  async permanentlyDeletePost(writerId: string, postId: string) {
    // Find the post and verify ownership
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        series: true,
        categories: {
          include: { category: true },
        },
        tags: {
          include: { tag: true },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== writerId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    // Use transaction to ensure data consistency
    await this.prisma.$transaction(async (tx) => {
      // Delete related records first
      await tx.postLike.deleteMany({
        where: { postId },
      });

      await tx.savedPost.deleteMany({
        where: { postId },
      });

      await tx.comment.deleteMany({
        where: { postId },
      });

      await tx.postCategory.deleteMany({
        where: { postId },
      });

      await tx.postTag.deleteMany({
        where: { postId },
      });

      await tx.notification.deleteMany({
        where: { postId },
      });

      await tx.report.deleteMany({
        where: { reportedPostId: postId },
      });

      // Update tag usage counts
      for (const postTag of post.tags) {
        await tx.tag.update({
          where: { id: postTag.tag.id },
          data: {
            usageCount: Math.max(0, postTag.tag.usageCount - 1),
          },
        });
      }

      // Update series posts count if post is in a series
      if (post.seriesId) {
        await tx.series.update({
          where: { id: post.seriesId },
          data: { postsCount: { decrement: 1 } },
        });
      }

      // Delete the post
      await tx.post.delete({
        where: { id: postId },
      });

      // Update user stats
      await this.updateUserStats(tx, writerId, 'decrement');
    });

    // Delete files from Cloudinary if they exist
    try {
      if (post.thumbnail) {
        await this.cloudinaryService.deleteImage(post.thumbnail);
      }
      if (post.audioUrl) {
        await this.cloudinaryService.deleteImage(post.audioUrl);
      }
    } catch (error) {
      console.error('Error deleting files from Cloudinary:', error);
      // Don't throw error here as the database deletion was successful
    }

    return {
      message: 'Post permanently deleted',
      postId,
    };
  }

  /**
   * Restore a soft-deleted post
   */
  async restorePost(writerId: string, postId: string) {
    // Find the deleted post and verify ownership
    const post = await this.prisma.post.findUnique({
      where: {
        id: postId,
        status: 'DELETED',
      },
      include: {
        series: true,
        tags: {
          include: { tag: true },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Deleted post not found');
    }

    if (post.authorId !== writerId) {
      throw new ForbiddenException('You can only restore your own posts');
    }

    // Use transaction to ensure data consistency
    const restoredPost = await this.prisma.$transaction(async (tx) => {
      // Update tag usage counts
      for (const postTag of post.tags) {
        await tx.tag.update({
          where: { id: postTag.tag.id },
          data: { usageCount: { increment: 1 } },
        });
      }

      // Update series posts count if post is in a series
      if (post.seriesId) {
        await tx.series.update({
          where: { id: post.seriesId },
          data: { postsCount: { increment: 1 } },
        });
      }

      // Restore the post (change status back to DRAFT)
      const restored = await tx.post.update({
        where: { id: postId },
        data: {
          status: 'DRAFT',
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

      // Update user stats
      await this.updateUserStats(tx, writerId, 'increment');

      return restored;
    });

    // Create activity record
    await this.createActivity(writerId, 'POST_RESTORED', postId);

    return {
      message: 'Post restored successfully',
      post: {
        ...restoredPost,
        categories: restoredPost.categories.map((pc) => pc.category),
        tags: restoredPost.tags.map((pt) => pt.tag),
      },
    };
  }

  /**
   * Get all deleted posts for a writer
   */
  async getDeletedPosts(
    writerId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;
    const take = Math.min(limit, 50);

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: {
          authorId: writerId,
          status: 'DELETED',
        },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          thumbnail: true,
          createdAt: true,
          updatedAt: true,
          publishedAt: true,
        },
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.post.count({
        where: {
          authorId: writerId,
          status: 'DELETED',
        },
      }),
    ]);

    const totalPages = Math.ceil(total / take);

    return {
      data: posts,
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
   * Update user statistics
   */
  private async updateUserStats(
    tx: any,
    userId: string,
    operation: 'increment' | 'decrement',
  ) {
    const userStats = await tx.userStats.findUnique({
      where: { userId },
    });

    if (userStats) {
      await tx.userStats.update({
        where: { userId },
        data: {
          totalPosts:
            operation === 'increment' ? { increment: 1 } : { decrement: 1 },
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
          postsCount:
            operation === 'increment' ? { increment: 1 } : { decrement: 1 },
        },
      });
    } else if (operation === 'increment') {
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
    const activityDescriptions = {
      POST_DELETED: 'Deleted a post',
      POST_RESTORED: 'Restored a post',
    };

    await this.prisma.recentActivity.create({
      data: {
        userId,
        type: type as any,
        description: activityDescriptions[type] || 'Post action',
        targetId,
        targetType: 'POST',
      },
    });
  }
}
