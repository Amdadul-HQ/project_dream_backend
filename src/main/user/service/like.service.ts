// like.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { successResponse } from 'src/common/utils/response.util';
import { PrismaService } from 'src/lib/prisma/prisma.service';

@Injectable()
export class LikeService {
  constructor(private prisma: PrismaService) {}

  // Logic to like a post
  async likePost(postId: string, userId: string) {
    // First, check if the post exists
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found.`);
    }

    // Check if user already liked this post
    const existingLike = await this.prisma.postLike.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    if (existingLike) {
      throw new ConflictException('You have already liked this post.');
    }

    // Create the like record and update post like count
    await this.prisma.$transaction(async (tx) => {
      // Create PostLike record
      await tx.postLike.create({
        data: {
          userId,
          postId,
        },
      });

      // Increment like count on post
      await tx.post.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
      });
    });

    return successResponse({ postId, userId }, 'Post liked successfully');
  }

  // Logic to unlike a post
  async unlikePost(postId: string, userId: string) {
    // Check if the like exists
    const existingLike = await this.prisma.postLike.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    if (!existingLike) {
      throw new NotFoundException(
        'Post not found or you have not liked this post.',
      );
    }

    // Remove the like record and update post like count
    await this.prisma.$transaction(async (tx) => {
      // Delete PostLike record
      await tx.postLike.delete({
        where: {
          userId_postId: {
            userId,
            postId,
          },
        },
      });

      // Decrement like count on post
      await tx.post.update({
        where: { id: postId },
        data: { likeCount: { decrement: 1 } },
      });
    });

    return successResponse({ postId, userId }, 'Post unliked successfully');
  }
}
