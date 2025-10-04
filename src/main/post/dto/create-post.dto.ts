/* eslint-disable @typescript-eslint/no-unsafe-return */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PostStatus } from '@prisma/client';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsEnum,
  IsObject,
  IsInt,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreatePostDto {
  @ApiProperty({
    description: 'The title of the post',
    example: 'A Deep Dive into NestJS',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'The content of the post in JSON format (Editor.js format)',
    example: JSON.stringify({
      blocks: [
        { type: 'header', data: { text: 'Introduction' } },
        {
          type: 'paragraph',
          data: { text: 'This post will cover advanced NestJS topics.' },
        },
      ],
    }),
    type: String,
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  @IsObject()
  @IsNotEmpty()
  content: any; // JSON type in Prisma

  @ApiPropertyOptional({
    description: 'Short excerpt or summary of the post for SEO and previews',
    example: 'Learn advanced NestJS concepts in this comprehensive guide.',
    type: String,
  })
  @IsString()
  @IsOptional()
  excerpt?: string;

  @ApiProperty({
    description:
      'Array of category IDs to associate with the post (comma-separated string or array)',
    example:
      '09876543-210e-dcba-9876-543210fedcba,a1b2c3d4-e5f6-7890-1234-567890abcdef',
    type: String,
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
    }
    if (Array.isArray(value)) {
      return value;
    }
    return [value];
  })
  @IsArray()
  @IsNotEmpty()
  categoryIds: string[];

  @ApiPropertyOptional({
    description: 'Array of tag names (comma-separated string or array)',
    example: 'nestjs,typescript,backend',
    type: String,
  })
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
    }
    if (Array.isArray(value)) {
      return value;
    }
    return [value];
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({
    description:
      'Name of a NEW series to create. Cannot be used together with seriesId.',
    example: 'Introduction to Node.js',
    type: String,
  })
  @IsString()
  @IsOptional()
  seriesname?: string;

  @ApiPropertyOptional({
    description:
      'ID of an EXISTING series. Cannot be used together with seriesname.',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    type: String,
    format: 'uuid',
  })
  @IsOptional()
  seriesId?: string;

  @ApiPropertyOptional({
    description: 'Order position within the series',
    example: 1,
    type: Number,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  seriesOrder?: number;

  @ApiProperty({
    description: 'The status of the post',
    enum: PostStatus,
    example: PostStatus.DRAFT,
    default: PostStatus.DRAFT,
  })
  @IsEnum(PostStatus)
  @IsNotEmpty()
  status: PostStatus;

  @ApiProperty({
    description: 'Thumbnail image file for the post',
    type: 'string',
    format: 'binary',
    required: true,
  })
  thumbnail: any; // Will be handled by multer interceptor

  @ApiPropertyOptional({
    description: 'Optional audio file for the post',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  audio?: any; // Will be handled by multer interceptor

  @ApiPropertyOptional({
    description: 'SEO meta title (recommended 50-60 characters)',
    example: 'NestJS Deep Dive - Complete Guide 2024',
    type: String,
  })
  @IsString()
  @IsOptional()
  metaTitle?: string;

  @ApiPropertyOptional({
    description: 'SEO meta description (recommended 150-160 characters)',
    example:
      'Comprehensive guide to advanced NestJS concepts including modules, providers, and middleware.',
    type: String,
  })
  @IsString()
  @IsOptional()
  metaDescription?: string;

  @ApiPropertyOptional({
    description: 'Scheduled publish date and time (ISO 8601 format)',
    example: '2024-12-31T10:00:00Z',
    type: String,
  })
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    return new Date(value);
  })
  @IsOptional()
  scheduledAt?: Date;
}
