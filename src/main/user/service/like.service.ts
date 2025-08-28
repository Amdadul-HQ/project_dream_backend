import { Injectable, NotFoundException } from '@nestjs/common';
import { successResponse } from '@project/common/utils/response.util';
import { PrismaService } from '@project/lib/prisma/prisma.service';

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

    // Connect the user to the post's like list
    const like = await this.prisma.post.update({
      where: { id: postId },
      data: {
        likeCount: { increment: 1 },
        like: {
          connect: {
            id: userId,
          },
        },
      },
    });

    return successResponse(like, 'Post like successfull');
  }

  // Logic to unlike a post
  async unlikePost(postId: string, userId: string) {
    // Check if the post exists and the user has liked it
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        like: {
          some: {
            id: userId,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException(
        'Post not found or you have not liked this post.',
      );
    }

    // Disconnect the user from the post's like list
    const unLike = await this.prisma.post.update({
      where: { id: postId },
      data: {
        likeCount: { decrement: 1 },
        like: {
          disconnect: {
            id: userId,
          },
        },
      },
    });

    return successResponse(unLike, 'Post unliked successfully');
  }
}
