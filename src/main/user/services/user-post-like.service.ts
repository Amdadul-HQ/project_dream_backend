import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/lib/prisma/prisma.service';
import { NotificationGateway } from 'src/main/notification/notification.gateway';

@Injectable()
export class PostLikeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  /**
   * Like a post
   */
  async likePost(userId: string, postId: string) {
    // Check if post exists and is published
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        title: true,
        status: true,
        authorId: true,
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check if already liked
    const existingLike = await this.prisma.postLike.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    if (existingLike) {
      throw new ConflictException('You have already liked this post');
    }

    // Get liker info
    const liker = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, profile: true },
    });

    // Create like
    const like = await this.prisma.postLike.create({
      data: {
        userId,
        postId,
      },
    });

    // Update post like count
    await this.prisma.post.update({
      where: { id: postId },
      data: {
        likeCount: {
          increment: 1,
        },
      },
    });

    // Update user stats (likes received by author)
    await this.prisma.userStats.upsert({
      where: { userId: post.authorId },
      update: {
        totalLikes: {
          increment: 1,
        },
      },
      create: {
        userId: post.authorId,
        totalLikes: 1,
      },
    });

    // Create and push notification
    if (userId !== post.authorId) {
      const notification = await this.prisma.notification.create({
        data: {
          type: 'POST_LIKED',
          title: 'Post Liked',
          content: `${liker?.name} liked your post: "${post.title}"`,
          senderId: userId,
          receiverId: post.authorId,
          postId,
        },
      });

      // ⚡ PUSH REAL-TIME NOTIFICATION
      this.notificationGateway.pushNotificationToUser(post.authorId, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        content: notification.content,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
        sender: {
          id: liker?.id,
          name: liker?.name,
          profile: liker?.profile,
        },
        metadata: {
          postId,
        },
      });
    }

    // Create activity log
    await this.prisma.recentActivity.create({
      data: {
        type: 'POST_LIKED',
        description: `Liked post: ${post.title}`,
        userId,
        targetId: postId,
        targetType: 'POST',
      },
    });

    return {
      success: true,
      message: 'Post liked successfully',
      data: like,
    };
  }

  /**
   * Unlike a post
   */
  async unlikePost(userId: string, postId: string) {
    // Check if like exists
    const like = await this.prisma.postLike.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    if (!like) {
      throw new NotFoundException('You have not liked this post');
    }

    // Get post for author ID
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });

    // Delete like
    await this.prisma.postLike.delete({
      where: {
        id: like.id,
      },
    });

    // Update post like count
    await this.prisma.post.update({
      where: { id: postId },
      data: {
        likeCount: {
          decrement: 1,
        },
      },
    });

    // Update user stats
    if (post) {
      await this.prisma.userStats
        .update({
          where: { userId: post.authorId },
          data: {
            totalLikes: {
              decrement: 1,
            },
          },
        })
        .catch(() => {
          // Ignore error if stats don't exist
        });
    }

    return {
      success: true,
      message: 'Post unliked successfully',
    };
  }

  /**
   * Get users who liked a post
   */
  async getPostLikes(postId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [likes, total] = await Promise.all([
      this.prisma.postLike.findMany({
        where: { postId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              profile: true,
            },
          },
        },
      }),
      this.prisma.postLike.count({ where: { postId } }),
    ]);

    return {
      success: true,
      data: {
        likes: likes.map((like) => ({
          id: like.id,
          user: like.user,
          likedAt: like.createdAt,
        })),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  /**
   * Check if user has liked a post
   */
  async hasLikedPost(userId: string, postId: string) {
    const like = await this.prisma.postLike.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    return {
      success: true,
      data: {
        hasLiked: !!like,
      },
    };
  }

  /**
   * Get user's liked posts
   */
  async getUserLikedPosts(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [likes, total] = await Promise.all([
      this.prisma.postLike.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          post: {
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
                  category: true,
                },
              },
              _count: {
                select: {
                  likes: true,
                  comments: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.postLike.count({ where: { userId } }),
    ]);

    return {
      success: true,
      data: {
        posts: likes.map((like) => like.post),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }
}
