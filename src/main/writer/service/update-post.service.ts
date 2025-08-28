import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/lib/prisma/prisma.service';
import { UpdatePostDto } from '../dto/updatePost.dto';
import { Post, Prisma, Series } from '@prisma/client';

@Injectable()
export class UpdatePostService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Updates an existing post with only the fields provided in the DTO.
   * Manages series association by creating a new series or linking to an existing one.
   * @param postId The ID of the post to update.
   * @param updatePostDto The DTO for post updates.
   * @param thumbnail Optional. The new thumbnail URL.
   * @returns The updated Post object.
   */
  async updatePost(
    postId: string,
    updatePostDto: UpdatePostDto,
    thumbnail?: string,
    writerId?: string,
  ): Promise<Post> {
    const { seriesId, seriesname, categoryIds, ...postData } = updatePostDto;

    // Check if the post to be updated exists
    const existingPost = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!existingPost) {
      throw new NotFoundException(`Post with ID "${postId}" not found.`);
    }

    // Start building the update data object with only provided fields
    const updateData: Prisma.PostUpdateInput = { ...postData };

    // Conditionally add thumbnail to update data if provided
    if (thumbnail !== undefined) {
      updateData.thumbnail = thumbnail;
    }

    // Use a Prisma transaction to ensure atomicity.
    return this.prisma.$transaction(async (tx) => {
      let postSeriesId: string | null = null;
      let nextPartNumber: number | null = null;

      // Logic to handle series creation or linking to an existing one
      if (seriesname) {
        if (seriesId !== undefined) {
          throw new BadRequestException(
            'Cannot provide both a new seriesName and an existing seriesId.',
          );
        }
        // Create a new series and get its ID
        const newSeries: Series = await tx.series.create({
          data: { name: seriesname },
        });
        postSeriesId = newSeries.id;
        nextPartNumber = 1; // First post in a new series
      } else if (seriesId !== undefined) {
        // If seriesId is provided, find the next part number or disconnect
        if (seriesId === null) {
          // Explicitly disconnect the post from its series.
          updateData.series = { disconnect: true };
          updateData.part = null;
        } else {
          // Find the next part number for the provided seriesId
          const lastPostInSeries = await tx.post.findFirst({
            where: { seriesId: seriesId },
            orderBy: { part: 'desc' },
          });
          nextPartNumber =
            lastPostInSeries && lastPostInSeries.part !== null
              ? lastPostInSeries.part + 1
              : 1;
          postSeriesId = seriesId;
          updateData.series = { connect: { id: postSeriesId } };
          updateData.part = nextPartNumber;
        }
      }

      // Update categories if provided
      if (categoryIds !== undefined) {
        updateData.categories = {
          set: categoryIds.map((id) => ({ id })),
        };
      }

      // Perform the update
      return await tx.post.update({
        where: { id: postId, writerId },
        data: updateData,
      });
    });
  }
}
