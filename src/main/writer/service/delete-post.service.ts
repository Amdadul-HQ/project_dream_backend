import { Injectable } from '@nestjs/common';
import { PrismaService } from '@project/lib/prisma/prisma.service';

@Injectable()
export class DeletePostService {
  constructor(private readonly prisma: PrismaService) {}

  // Delete Post
  async deletePost(writerId: string, postId: string) {
    return await this.prisma.post.delete({
      where: {
        id: postId,
        writerId: writerId,
      },
    });
  }
}
