/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// follow.service.ts
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/lib/prisma/prisma.service';

@Injectable()
export class FollowService {
  constructor(private prisma: PrismaService) {}

  async followUser(followerId: string, followeeId: string) {
    if (followerId === followeeId) {
      throw new ConflictException('You cannot follow yourself.');
    }

    // Ensure the followee exists
    const followee = await this.prisma.user.findUnique({
      where: { id: followeeId },
    });
    if (!followee) {
      throw new NotFoundException(`User with ID ${followeeId} not found.`);
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        // Create follow record
        await tx.follow.create({
          data: {
            followerId,
            followeeId,
          },
        });

        // Update or create UserStats for followee (totalFollowers)
        await tx.userStats.upsert({
          where: { userId: followeeId },
          create: {
            userId: followeeId,
            totalFollowers: 1,
          },
          update: {
            totalFollowers: { increment: 1 },
          },
        });

        // Update or create UserStats for follower (totalFollowing)
        await tx.userStats.upsert({
          where: { userId: followerId },
          create: {
            userId: followerId,
            totalFollowing: 1,
          },
          update: {
            totalFollowing: { increment: 1 },
          },
        });
      });

      return { message: `Successfully followed user ${followeeId}` };
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('You are already following this user.');
      }
      throw error;
    }
  }

  async unfollowUser(followerId: string, followeeId: string) {
    try {
      await this.prisma.$transaction(async (tx) => {
        // Delete follow record
        await tx.follow.delete({
          where: {
            followerId_followeeId: {
              followerId,
              followeeId,
            },
          },
        });

        // Decrease follower count for followee
        await tx.userStats.updateMany({
          where: { userId: followeeId, totalFollowers: { gt: 0 } },
          data: {
            totalFollowers: { decrement: 1 },
          },
        });

        // Decrease following count for follower
        await tx.userStats.updateMany({
          where: { userId: followerId, totalFollowing: { gt: 0 } },
          data: {
            totalFollowing: { decrement: 1 },
          },
        });
      });

      return { message: `Successfully unfollowed user ${followeeId}` };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('You are not following this user.');
      }
      throw error;
    }
  }
}
