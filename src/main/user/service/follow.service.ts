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
    // Prevent a user from following themselves
    if (followerId === followeeId) {
      throw new ConflictException('You cannot follow yourself.');
    }

    // Check if the followee exists
    const followee = await this.prisma.user.findUnique({
      where: { id: followeeId },
    });
    if (!followee) {
      throw new NotFoundException(`User with ID ${followeeId} not found.`);
    }

    try {
      await this.prisma.follow.create({
        data: {
          followerId,
          followeeId,
        },
      });
      return { message: `Successfully followed user ${followeeId}` };
    } catch (error) {
      // Handle the case where the follow relationship already exists (due to @@unique constraint)
      if (error.code === 'P2002') {
        throw new ConflictException('You are already following this user.');
      }
      throw error;
    }
  }

  async unfollowUser(followerId: string, followeeId: string) {
    try {
      await this.prisma.follow.delete({
        where: {
          followerId_followeeId: {
            followerId,
            followeeId,
          },
        },
      });
      return { message: `Successfully unfollowed user ${followeeId}` };
    } catch (error) {
      // Handle the case where the follow relationship does not exist
      if (error.code === 'P2025') {
        throw new NotFoundException('You are not following this user.');
      }
      throw error;
    }
  }
}
