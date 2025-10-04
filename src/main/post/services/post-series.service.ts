// src/series/services/create-post-series.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/lib/prisma/prisma.service';
import { CreateSeriesDto } from '../dto/create-post-series.dto';
import { successResponse } from 'src/common/utils/response.util';

@Injectable()
export class PostSeriesService {
  constructor(private readonly prisma: PrismaService) {}

  async createSeries(dto: CreateSeriesDto, userId: string) {
    // check for duplicate slug
    const existingSeries = await this.prisma.series.findUnique({
      where: { slug: dto.slug },
    });

    if (existingSeries) {
      throw new BadRequestException(
        `Series with slug "${dto.slug}" already exists.`,
      );
    }

    // create new series
    const result = await this.prisma.series.create({
      data: {
        authorId: userId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        thumbnail: dto.thumbnail,
      },
    });
    return successResponse(result, 'Series created successfully');
  }

  // Get all series by a specific user
  async getSeriesByUserId(userId: string) {
    const result = await this.prisma.series.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
    });
    return successResponse(result, 'Series fetched successfully');
  }
}
