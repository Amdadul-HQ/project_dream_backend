import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class PostFeedQueryDto {
  @ApiProperty({
    description: 'Type of feed to retrieve.',
    enum: ['recent', 'trending', 'following', 'liked', 'topPicks'],
    required: false,
    default: 'recent',
  })
  @IsOptional()
  @IsString()
  @IsIn(['recent', 'trending', 'following', 'liked', 'topPicks'])
  feedType?: 'recent' | 'trending' | 'following' | 'liked' | 'topPicks' =
    'recent';

  @ApiProperty({
    description: 'Filter posts by category ID.',
    required: false,
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({
    description: 'Post ID for cursor-based pagination.',
    required: false,
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiProperty({
    description: 'Number of posts to return per page.',
    required: false,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 10;
}
