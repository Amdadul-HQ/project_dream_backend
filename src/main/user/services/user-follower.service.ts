// ============================================================================
// UPDATED: follow.service.ts (user-follower.service.ts)
// ============================================================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/lib/prisma/prisma.service';
import { NotificationGateway } from 'src/main/notification/notification.gateway';

@Injectable()
export class FollowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationGateway: NotificationGateway, // ADDED
  ) {}

  /**
   * Follow a user
   */
  async followUser(followerId: string, followeeId: string) {
    console.log('🔄 Follow request:', { followerId, followeeId });

    // Prevent self-follow
    if (followerId === followeeId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    // Check if followee exists
    const followee = await this.prisma.user.findUnique({
      where: { id: followeeId },
      select: { id: true, name: true, status: true, profile: true },
    });

    if (!followee) {
      throw new NotFoundException('User not found');
    }

    // Check if user is active
    if (followee.status !== 'Active') {
      throw new BadRequestException('Cannot follow inactive user');
    }

    // Check if already following
    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_followeeId: {
          followerId,
          followeeId,
        },
      },
    });

    if (existingFollow) {
      throw new ConflictException('You are already following this user');
    }

    // Get follower info for notification
    const follower = await this.prisma.user.findUnique({
      where: { id: followerId },
      select: { id: true, name: true, profile: true },
    });

    console.log('👤 Follower info:', follower);

    // Create follow relationship
    const follow = await this.prisma.follow.create({
      data: {
        followerId,
        followeeId,
      },
      include: {
        followee: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: true,
          },
        },
      },
    });

    console.log('✅ Follow relationship created:', follow.id);

    // Update user stats for both users
    await Promise.all([
      this.updateFollowerStats(followerId, 'INCREMENT'),
      this.updateFolloweeStats(followeeId, 'INCREMENT'),
    ]);

    // Create notification in database
    const notification = await this.prisma.notification.create({
      data: {
        type: 'NEW_FOLLOWER',
        title: 'New Follower',
        content: `${follower?.name} started following you`,
        senderId: followerId,
        receiverId: followeeId,
        followId: follow.id,
      },
    });

    // ⚡ PUSH REAL-TIME NOTIFICATION VIA WEBSOCKET
    try {
      const notificationPayload = {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        content: notification.content,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
        sender: {
          id: follower?.id,
          name: follower?.name,
          profile: follower?.profile,
        },
        metadata: {
          followId: follow.id,
        },
      };

      this.notificationGateway.pushNotificationToUser(
        followeeId,
        notificationPayload,
      );

      console.log('✅ Notification pushed successfully');
    } catch (error) {
      console.error('❌ Failed to push notification:', error);
    }

    // Create activity log
    await this.prisma.recentActivity.create({
      data: {
        type: 'USER_FOLLOWED',
        description: `Followed ${followee.name}`,
        userId: followerId,
        targetId: followeeId,
        targetType: 'USER',
      },
    });

    return {
      success: true,
      message: 'Successfully followed user',
      data: follow,
    };
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(followerId: string, followeeId: string) {
    // Check if follow relationship exists
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followeeId: {
          followerId,
          followeeId,
        },
      },
    });

    if (!follow) {
      throw new NotFoundException('You are not following this user');
    }

    // Delete follow relationship
    await this.prisma.follow.delete({
      where: {
        id: follow.id,
      },
    });

    // Update user stats for both users
    await Promise.all([
      this.updateFollowerStats(followerId, 'DECREMENT'),
      this.updateFolloweeStats(followeeId, 'DECREMENT'),
    ]);

    // Create activity log
    await this.prisma.recentActivity.create({
      data: {
        type: 'USER_UNFOLLOWED',
        description: `Unfollowed user`,
        userId: followerId,
        targetId: followeeId,
        targetType: 'USER',
      },
    });

    return {
      success: true,
      message: 'Successfully unfollowed user',
    };
  }

  /**
   * Get followers list
   */
  async getFollowers(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [followers, total] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followeeId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          follower: {
            select: {
              id: true,
              name: true,
              email: true,
              profile: true,
              role: true,
              _count: {
                select: {
                  posts: true,
                  followers: true,
                  following: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.follow.count({ where: { followeeId: userId } }),
    ]);

    return {
      success: true,
      data: {
        followers: followers.map((f) => f.follower),
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
   * Get following list
   */
  async getFollowing(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [following, total] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followerId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          followee: {
            select: {
              id: true,
              name: true,
              email: true,
              profile: true,
              role: true,
              _count: {
                select: {
                  posts: true,
                  followers: true,
                  following: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.follow.count({ where: { followerId: userId } }),
    ]);

    return {
      success: true,
      data: {
        following: following.map((f) => f.followee),
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
   * Check if user is following another user
   */
  async isFollowing(followerId: string, followeeId: string) {
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followeeId: {
          followerId,
          followeeId,
        },
      },
    });

    return {
      success: true,
      data: {
        isFollowing: !!follow,
      },
    };
  }

  /**
   * Update follower stats (following count)
   */
  private async updateFollowerStats(
    userId: string,
    action: 'INCREMENT' | 'DECREMENT',
  ) {
    await this.prisma.userStats.upsert({
      where: { userId },
      update: {
        totalFollowing: {
          [action === 'INCREMENT' ? 'increment' : 'decrement']: 1,
        },
      },
      create: {
        userId,
        totalFollowing: 1,
      },
    });
  }

  /**
   * Update followee stats (followers count)
   */
  private async updateFolloweeStats(
    userId: string,
    action: 'INCREMENT' | 'DECREMENT',
  ) {
    await this.prisma.userStats.upsert({
      where: { userId },
      update: {
        totalFollowers: {
          [action === 'INCREMENT' ? 'increment' : 'decrement']: 1,
        },
      },
      create: {
        userId,
        totalFollowers: 1,
      },
    });

    // Update monthly stats
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    if (action === 'INCREMENT') {
      await this.prisma.userMonthlyStats.upsert({
        where: {
          userId_year_month: { userId, year, month },
        },
        update: {
          followersGained: { increment: 1 },
        },
        create: {
          userId,
          year,
          month,
          followersGained: 1,
        },
      });
    }
  }
}
