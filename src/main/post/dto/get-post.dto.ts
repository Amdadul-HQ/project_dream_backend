/* eslint-disable @typescript-eslint/no-unsafe-return */
// dto/get-posts.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsEnum,
  IsArray,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum PostSortBy {
  RECENT = 'recent',
  POPULAR = 'popular',
  TOP_RATED = 'top_rated',
  FOLLOWING = 'following',
  LIKED = 'liked',
}

export class GetPostsDto {
  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Sort by: recent, popular, top_rated, following, liked',
    enum: PostSortBy,
    default: PostSortBy.RECENT,
  })
  @IsOptional()
  @IsEnum(PostSortBy)
  sortBy?: PostSortBy = PostSortBy.RECENT;

  @ApiPropertyOptional({
    description: 'Category slug or ID',
    example: 'horror',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Multiple category slugs (comma-separated)',
    example: 'horror,thriller,mystery',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((v) => v.trim());
    }
    return value;
  })
  @IsArray()
  categories?: string[];

  @ApiPropertyOptional({
    description: 'Tag slug',
    example: 'supernatural',
  })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({
    description: 'Series ID',
  })
  @IsOptional()
  @IsString()
  seriesId?: string;

  @ApiPropertyOptional({
    description: 'Author/Writer ID',
  })
  @IsOptional()
  @IsString()
  authorId?: string;

  @ApiPropertyOptional({
    description: 'Search query (title, excerpt, content)',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
