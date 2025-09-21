/* eslint-disable @typescript-eslint/no-unsafe-return */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsDateString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PostStatus } from '@prisma/client';

export class UpdatePostDto {
  @ApiPropertyOptional({
    description: 'The title of the post',
    example: 'Updated: A Deep Dive into NestJS',
    minLength: 1,
    maxLength: 200,
  })
  @IsOptional()
  @IsString({ message: 'Title must be a string' })
  @MinLength(1, { message: 'Title must be at least 1 character' })
  @MaxLength(200, { message: 'Title must not exceed 200 characters' })
  title?: string;

  @ApiPropertyOptional({
    description: 'The content of the post in JSON format (EditorJS format)',
    example: {
      time: 1672531200000,
      blocks: [
        {
          id: 'block-1',
          type: 'header',
          data: { text: 'Updated Introduction', level: 2 },
        },
        {
          id: 'block-2',
          type: 'paragraph',
          data: {
            text: 'This updated post covers even more advanced NestJS topics.',
          },
        },
      ],
      version: '2.28.2',
    },
  })
  @IsOptional()
  content?: any; // EditorJS content structure

  @ApiPropertyOptional({
    description: 'Short excerpt or summary of the post',
    example:
      'Updated: Learn advanced NestJS concepts including guards, interceptors, and more.',
    maxLength: 300,
  })
  @IsOptional()
  @IsString({ message: 'Excerpt must be a string' })
  @MaxLength(300, { message: 'Excerpt must not exceed 300 characters' })
  excerpt?: string;

  @ApiPropertyOptional({
    description: 'The IDs of the categories for the post',
    example: ['cm4abc123def', 'cm4xyz789ghi'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Category IDs must be an array' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0);
    }
    if (Array.isArray(value)) {
      return value.filter(
        (id) => typeof id === 'string' && id.trim().length > 0,
      );
    }
    return value;
  })
  categoryIds?: string[];

  @ApiPropertyOptional({
    description: 'Array of tag names for the post',
    example: ['nestjs', 'typescript', 'backend', 'updated'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Tag names must be an array' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
    }
    if (Array.isArray(value)) {
      return value.filter(
        (tag) => typeof tag === 'string' && tag.trim().length > 0,
      );
    }
    return value;
  })
  tagNames?: string[];

  @ApiPropertyOptional({
    description: 'The name of a new series to create and move this post to',
    example: 'Advanced Node.js Concepts',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Series name must be a string' })
  @MaxLength(100, { message: 'Series name must not exceed 100 characters' })
  seriesname?: string;

  @ApiPropertyOptional({
    description:
      'The ID of an existing series to move this post to (use null to remove from series)',
    example: 'cm4series123',
  })
  @IsOptional()
  @IsString({ message: 'Series ID must be a string' })
  seriesId?: string | null;

  @ApiPropertyOptional({
    description: 'The status of the post',
    enum: PostStatus,
    example: PostStatus.PUBLISHED,
  })
  @IsOptional()
  @IsEnum(PostStatus, { message: 'Status must be a valid PostStatus value' })
  status?: PostStatus;

  @ApiPropertyOptional({
    description: 'Meta title for SEO',
    example: 'Updated: A Deep Dive into NestJS - Complete Guide',
    maxLength: 60,
  })
  @IsOptional()
  @IsString({ message: 'Meta title must be a string' })
  @MaxLength(60, {
    message: 'Meta title should not exceed 60 characters for SEO',
  })
  metaTitle?: string;

  @ApiPropertyOptional({
    description: 'Meta description for SEO',
    example:
      'Updated guide covering advanced NestJS concepts with practical examples and best practices.',
    maxLength: 160,
  })
  @IsOptional()
  @IsString({ message: 'Meta description must be a string' })
  @MaxLength(160, {
    message: 'Meta description should not exceed 160 characters for SEO',
  })
  metaDescription?: string;

  @ApiPropertyOptional({
    description:
      'Schedule the post to be published at a specific time (ISO string). Use null to remove scheduling.',
    example: '2024-12-25T10:00:00Z',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Scheduled date must be a valid ISO date string' },
  )
  scheduledAt?: string | null;

  @ApiPropertyOptional({
    description: 'Remove thumbnail (set to true to remove current thumbnail)',
    example: false,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    return false;
  })
  removeThumbnail?: boolean;

  @ApiPropertyOptional({
    description: 'Remove audio (set to true to remove current audio)',
    example: false,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    return false;
  })
  removeAudio?: boolean;
}
