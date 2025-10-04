// src/series/dto/create-series.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty, IsUrl } from 'class-validator';

export class CreateSeriesDto {
  @ApiProperty({
    description: 'Series name (must be unique)',
    example: 'JavaScript Basics',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Unique slug for the series (used in URLs)',
    example: 'javascript-basics',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiPropertyOptional({
    description: 'Short description of the series',
    example: 'A beginner-friendly guide to JavaScript fundamentals.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Thumbnail image URL for the series',
    example: 'https://example.com/thumbnails/js-series.png',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Thumbnail must be a valid URL' })
  thumbnail?: string;
}
