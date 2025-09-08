import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/lib/prisma/prisma.service';
import { CreatePostDto } from '../dto/createPost.dto';
import { Post, Series } from '@prisma/client';
import { CloudinaryService } from 'src/lib/cloudinary/cloudinary.service';

@Injectable()
export class CreatePostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Creates a new post with optional series and audio.
   * Handles part numbering inside a series.
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

    // Wrap inside transaction
    const createdPost = await this.prisma.$transaction(async (tx) => {
      // --- Handle series ---
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

      // --- Categories ---
      const categoriesToConnect = categoryIds?.map((id) => ({ id })) ?? [];

      // --- Create Post ---
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

    // --- Handle audio after post creation ---
    if (audio) {
      try {
        await this.cloudinaryService.processUploadedAudio(
          audio,
          createdPost.id,
          postSeriesId,
          nextPartNumber,
        );

        // Ensure audio is linked in DB (Audio model requires postId unique)
        await this.prisma.audio.create({
          data: {
            postId: createdPost.id,
            seriesId: postSeriesId,
            part: nextPartNumber,
            filename: audio.filename,
            originalFilename: audio.originalname,
            path: audio.path,
            url: '', // cloudinaryService should return URL ideally
            mimeType: audio.mimetype,
            size: audio.size,
          },
        });
      } catch (error) {
        console.error('Error processing uploaded audio:', error);
        throw new BadRequestException('Failed to upload audio file');
      }
    }

    return createdPost;
  }
}
