import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsArray } from 'class-validator';

export class DashboardStatsDto {
  @ApiProperty({
    description: 'Total number of users.',
    example: 1500,
  })
  @IsNumber()
  totalUsers: number;

  @ApiProperty({
    description: 'Total number of posts.',
    example: 750,
  })
  @IsNumber()
  totalPosts: number;

  @ApiProperty({
    description: 'Total number of likes.',
    example: 12000,
  })
  @IsNumber()
  totalLikes: number;

  @ApiProperty({
    description: 'Total number of comments.',
    example: 5000,
  })
  @IsNumber()
  totalComments: number;

  @ApiProperty({
    description: 'Total number of post views.',
    example: 25000,
  })
  @IsNumber()
  totalViews: number;

  @ApiProperty({
    description: 'Data for user growth over time, suitable for a chart.',
    example: [
      { date: '2023-01-01', count: 10 },
      { date: '2023-01-02', count: 15 },
    ],
  })
  @IsArray()
  userGrowth: { date: string; count: number }[];

  @ApiProperty({
    description:
      'Data for post engagement (likes, comments, views) over time, suitable for a chart.',
    example: [{ date: '2023-01-01', likes: 50, comments: 10, views: 200 }],
  })
  @IsArray()
  postEngagement: {
    date: string;
    likes: number;
    comments: number;
    views: number;
  }[];
}
