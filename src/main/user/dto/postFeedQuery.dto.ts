import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum FeedType {
  RECENT = 'recent',
  TRENDING = 'trending',
  FOLLOWING = 'following',
  LIKED = 'liked',
  TOP_PICKS = 'topPicks',
}

export class PostFeedQueryDto {
  @ApiPropertyOptional({ description: 'Category ID to filter posts' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Type of feed to retrieve',
    enum: FeedType,
    default: FeedType.RECENT,
  })
  @IsOptional()
  @IsEnum(FeedType)
  feedType?: FeedType;

  @ApiPropertyOptional({ description: 'Cursor for pagination' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Number of posts per page',
    minimum: 1,
    maximum: 50,
    default: 10,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;
}
