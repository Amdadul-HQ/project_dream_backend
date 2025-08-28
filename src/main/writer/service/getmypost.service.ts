import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/lib/prisma/prisma.service';
import { Post } from '@prisma/client';
import { GetAllPostsDto } from '../dto/getPost.dto';

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves a paginated list of posts with filtering and searching capabilities.
   * @param query The DTO containing filter, search, and pagination parameters.
   * @returns A promise that resolves to an object containing the posts and total count.
   */
  async getMyAllPosts(
    writerId: string,
    query: GetAllPostsDto,
  ): Promise<{ posts: Post[]; total: number }> {
    const {
      search,
      category,
      writerName,
      seriesName,
      sortBy,
      page,
      limit,
      status,
    } = query;

    const pageNumber = page ? parseInt(page, 10) : 1;
    const take = limit ? parseInt(limit, 10) : 10;
    const skip = (pageNumber - 1) * take;

    const where: any = {};
    where.writerId = writerId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { writer: { name: { contains: search, mode: 'insensitive' } } },
        { series: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (writerName) {
      where.writer = { name: { contains: writerName, mode: 'insensitive' } };
    }

    if (seriesName) {
      where.series = { name: { contains: seriesName, mode: 'insensitive' } };
    }

    if (category) {
      where.categories = {
        some: {
          name: { contains: category, mode: 'insensitive' },
        },
      };
    }

    // ✅ Filter by status if provided
    if (status) {
      where.status = status;
    }

    const orderBy: any = {};
    if (sortBy === 'likes') {
      orderBy.likeCount = 'desc';
    } else if (sortBy === 'views') {
      orderBy.viewCount = 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const total = await this.prisma.post.count({ where });

    const posts = await this.prisma.post.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        writer: { select: { id: true, name: true, profile: true } },
        series: true,
        categories: true,
        audio: true,
      },
    });

    return { posts, total };
  }
}
