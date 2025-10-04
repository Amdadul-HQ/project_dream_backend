import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/lib/prisma/prisma.service';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';
import { NotificationGateway } from 'src/main/notification/notification.gateway';

@Injectable()
export class CommentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  /**
   * Create a comment on a post or reply to another comment
   */
  async createComment(userId: string, postId: string, dto: CreateCommentDto) {
    // Check if post exists
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        title: true,
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

    // If replying to a comment, verify it exists and belongs to the same post
    if (dto.parentId) {
      const parentComment = await this.prisma.comment.findUnique({
        where: { id: dto.parentId },
        select: { postId: true, userId: true },
      });

      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }

      if (parentComment.postId !== postId) {
        throw new BadRequestException(
          'Parent comment does not belong to this post',
        );
      }
    }

    const commenter = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, profile: true },
    });

    // Create comment
    const comment = await this.prisma.comment.create({
      data: {
        content: dto.content,
        userId,
        postId,
        parentId: dto.parentId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile: true,
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    // Update post comment count
    await this.prisma.post.update({
      where: { id: postId },
      data: {
        commentCount: {
          increment: 1,
        },
      },
    });

    // If it's a reply, update parent comment reply count
    if (dto.parentId) {
      await this.prisma.comment.update({
        where: { id: dto.parentId },
        data: {
          replyCount: {
            increment: 1,
          },
        },
      });
    }

    // Update user stats
    await this.prisma.userStats.upsert({
      where: { userId: post.authorId },
      update: {
        totalComments: {
          increment: 1,
        },
      },
      create: {
        userId: post.authorId,
        totalComments: 1,
      },
    });

    // Determine notification receiver
    let receiverId = post.authorId;
    if (dto.parentId) {
      const parentComment = await this.prisma.comment.findUnique({
        where: { id: dto.parentId },
        select: { userId: true },
      });
      if (parentComment) {
        receiverId = parentComment.userId;
      }
    }

    // Create and push notification
    if (userId !== receiverId) {
      const notification = await this.prisma.notification.create({
        data: {
          type: dto.parentId ? 'COMMENT_REPLIED' : 'POST_COMMENTED',
          title: dto.parentId ? 'Reply to Comment' : 'New Comment',
          content: dto.parentId
            ? `${commenter?.name} replied to your comment`
            : `${commenter?.name} commented on your post: "${post.title}"`,
          senderId: userId,
          receiverId,
          postId,
          commentId: comment.id,
        },
      });

      // ⚡ PUSH REAL-TIME NOTIFICATION
      this.notificationGateway.pushNotificationToUser(receiverId, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        content: notification.content,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
        sender: {
          id: commenter?.id,
          name: commenter?.name,
          profile: commenter?.profile,
        },
        metadata: {
          postId,
          commentId: comment.id,
        },
      });
    }

    // Create activity log
    await this.prisma.recentActivity.create({
      data: {
        type: 'COMMENT_CREATED',
        description: dto.parentId
          ? 'Replied to a comment'
          : `Commented on: ${post.title}`,
        userId,
        targetId: comment.id,
        targetType: 'COMMENT',
      },
    });

    return {
      success: true,
      message: 'Comment created successfully',
      data: comment,
    };
  }

  /**
   * Update a comment
   */
  async updateComment(
    userId: string,
    commentId: string,
    dto: UpdateCommentDto,
  ) {
    // Find comment and verify ownership
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { userId: true },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new BadRequestException('You can only update your own comments');
    }

    // Update comment
    const updatedComment = await this.prisma.comment.update({
      where: { id: commentId },
      data: {
        content: dto.content,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile: true,
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Comment updated successfully',
      data: updatedComment,
    };
  }

  /**
   * Delete a comment
   */
  async deleteComment(userId: string, commentId: string) {
    // Find comment and verify ownership
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: {
        userId: true,
        postId: true,
        parentId: true,
        replyCount: true,
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new BadRequestException('You can only delete your own comments');
    }

    // Delete comment (cascade will handle replies)
    await this.prisma.comment.delete({
      where: { id: commentId },
    });

    // Update post comment count (including replies)
    await this.prisma.post.update({
      where: { id: comment.postId },
      data: {
        commentCount: {
          decrement: 1 + comment.replyCount, // Decrement main comment + all replies
        },
      },
    });

    // If it's a reply, update parent comment reply count
    if (comment.parentId) {
      await this.prisma.comment
        .update({
          where: { id: comment.parentId },
          data: {
            replyCount: {
              decrement: 1,
            },
          },
        })
        .catch(() => {
          // Ignore error if parent comment was already deleted
        });
    }

    return {
      success: true,
      message: 'Comment deleted successfully',
    };
  }

  /**
   * Get comments for a post (top-level only)
   */
  async getPostComments(postId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: {
          postId,
          parentId: null, // Only top-level comments
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profile: true,
            },
          },
          _count: {
            select: {
              replies: true,
            },
          },
        },
      }),
      this.prisma.comment.count({
        where: {
          postId,
          parentId: null,
        },
      }),
    ]);

    return {
      success: true,
      data: {
        comments,
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
   * Get replies to a comment
   */
  async getCommentReplies(commentId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    // Verify parent comment exists
    const parentComment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true },
    });

    if (!parentComment) {
      throw new NotFoundException('Comment not found');
    }

    const [replies, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: {
          parentId: commentId,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' }, // Replies in chronological order
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profile: true,
            },
          },
        },
      }),
      this.prisma.comment.count({
        where: {
          parentId: commentId,
        },
      }),
    ]);

    return {
      success: true,
      data: {
        replies,
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
   * Get user's comments
   */
  async getUserComments(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          post: {
            select: {
              id: true,
              title: true,
              slug: true,
              thumbnail: true,
            },
          },
          _count: {
            select: {
              replies: true,
            },
          },
        },
      }),
      this.prisma.comment.count({ where: { userId } }),
    ]);

    return {
      success: true,
      data: {
        comments,
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
   * Get a single comment by ID
   */
  async getCommentById(commentId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        parent: {
          select: {
            id: true,
            content: true,
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return {
      success: true,
      data: comment,
    };
  }
}
