import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/lib/prisma/prisma.service';
import { CreateCommentDto } from '../dto/createComment.dto';

@Injectable()
export class CommentService {
  constructor(private prisma: PrismaService) {}

  async createComment(createCommentDto: CreateCommentDto, userId: string) {
    const { postId, parentId, comment } = createCommentDto;

    // Check if the post exists
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found.`);
    }

    // Check if the parent comment exists if provided
    if (parentId) {
      const parentComment = await this.prisma.comment.findUnique({
        where: { id: parentId },
      });
      if (!parentComment) {
        throw new NotFoundException(
          `Parent comment with ID ${parentId} not found.`,
        );
      }
    }

    const newComment = await this.prisma.comment.create({
      data: {
        comment,
        postId,
        userId,
        parentId,
      },
    });

    // Also increment the comment count on the post
    await this.prisma.post.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 } },
    });

    return newComment;
  }

  async deleteComment(commentId: string, userId: string) {
    // Find the comment and check if the user is the author
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found.`);
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this comment.',
      );
    }

    await this.prisma.comment.delete({ where: { id: commentId } });

    // Decrement the comment count on the post
    await this.prisma.post.update({
      where: { id: comment.postId },
      data: { commentCount: { decrement: 1 } },
    });

    return { message: 'Comment deleted successfully' };
  }
}
