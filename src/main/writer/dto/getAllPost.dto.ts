import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsOptional, IsInt, Min, Max, IsEnum, IsString } from 'class-validator';
import { PostStatus } from '@prisma/client';

export class GetAllPostsDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(50, { message: 'Limit cannot exceed 50' })
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by post status',
    enum: PostStatus,
    example: PostStatus.PUBLISHED,
  })
  @IsOptional()
  @IsEnum(PostStatus, { message: 'Status must be a valid PostStatus value' })
  status?: PostStatus;

  @ApiPropertyOptional({
    description: 'Filter by series ID',
    example: 'cm4series123',
  })
  @IsOptional()
  @IsString({ message: 'Series ID must be a string' })
  seriesId?: string;

  @ApiPropertyOptional({
    description: 'Filter by category ID',
    example: 'cm4category123',
  })
  @IsOptional()
  @IsString({ message: 'Category ID must be a string' })
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Search in post title and excerpt',
    example: 'nestjs tutorial',
  })
  @IsOptional()
  @IsString({ message: 'Search query must be a string' })
  search?: string;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: [
      'createdAt',
      'updatedAt',
      'publishedAt',
      'title',
      'viewsCount',
      'likeCount',
    ],
    example: 'createdAt',
    default: 'createdAt',
  })
  @IsOptional()
  @IsEnum(
    [
      'createdAt',
      'updatedAt',
      'publishedAt',
      'title',
      'viewsCount',
      'likeCount',
    ],
    {
      message:
        'Sort field must be one of: createdAt, updatedAt, publishedAt, title, viewsCount, likeCount',
    },
  )
  sortBy?:
    | 'createdAt'
    | 'updatedAt'
    | 'publishedAt'
    | 'title'
    | 'viewsCount'
    | 'likeCount' = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    example: 'desc',
    default: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'], { message: 'Sort order must be either asc or desc' })
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({
    description: 'Filter by date range - start date (ISO string)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsString({ message: 'Start date must be a string' })
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'Filter by date range - end date (ISO string)',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsString({ message: 'End date must be a string' })
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  endDate?: Date;

  @ApiPropertyOptional({
    description: 'Include only posts with audio',
    example: true,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  hasAudio?: boolean;

  @ApiPropertyOptional({
    description: 'Include only posts with thumbnails',
    example: true,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  hasThumbnail?: boolean;
}
