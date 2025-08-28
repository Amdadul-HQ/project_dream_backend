import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@project/lib/prisma/prisma.service';
import { CreatePostDto } from '../dto/createPost.dto';
import { Post, Series } from '@prisma/client';
import { CloudinaryService } from '@project/lib/cloudinary/cloudinary.service';

@Injectable()
export class CreatePostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Creates a new post.
   * If a seriesName is provided, a new series is created first within a transaction.
   * If a seriesId is provided, the post is added to the existing series.
   * A unique part number is automatically assigned within the series.
   * @param createPostDto The DTO for post creation.
   * @returns The newly created Post object.
   */
  async createPost(
    createPostDto: CreatePostDto,
    thumbnail: string,
    audio?: Express.Multer.File,
    writerId?: string,
  ): Promise<Post> {
    const { seriesId, seriesname, categoryIds, ...postData } = createPostDto;

    let postSeriesId: string | undefined;
    let nextPartNumber: number | undefined;

    // First, create the post and related entities inside a transaction
    const createdPost = await this.prisma.$transaction(async (tx) => {
      // Handle series creation or connection
      if (seriesname) {
        if (seriesId) {
          throw new BadRequestException(
            'Cannot provide both a new seriesName and an existing seriesId.',
          );
        }
        const newSeries: Series = await tx.series.create({
          data: { name: seriesname },
        });
        postSeriesId = newSeries.id;
        nextPartNumber = 1;
      } else if (seriesId) {
        const lastPostInSeries = await tx.post.findFirst({
          where: { seriesId },
          orderBy: { part: 'desc' },
        });
        nextPartNumber = (lastPostInSeries?.part ?? 0) + 1;
        postSeriesId = seriesId;
      }

      const categoriesToConnect = categoryIds.map((id) => ({ id }));

      return await tx.post.create({
        data: {
          ...postData,
          thumbnail,
          writer: { connect: { id: writerId } },
          series: postSeriesId ? { connect: { id: postSeriesId } } : undefined,
          categories: { connect: categoriesToConnect },
          part: nextPartNumber,
        },
      });
    });

    // ✅ Now outside the transaction — post is committed, postId is safe to use
    if (audio) {
      try {
        await this.cloudinaryService.processUploadedAudio(
          audio,
          createdPost.id,
          postSeriesId,
          nextPartNumber,
        );
      } catch (error) {
        console.error('Error processing uploaded audio:', error);
        // Optionally: delete the post if audio upload fails?
        throw new BadRequestException('Failed to upload audio file');
      }
    }

    return createdPost;
  }
}
