/* eslint-disable @typescript-eslint/no-unsafe-return */
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEnum,
  IsDateString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PostStatus } from '@prisma/client';

export class CreatePostDto {
  @ApiProperty({
    description: 'The title of the post',
    example: 'A Deep Dive into NestJS',
    required: true,
    minLength: 1,
    maxLength: 200,
  })
  @IsNotEmpty({ message: 'Title is required' })
  @IsString({ message: 'Title must be a string' })
  @MinLength(1, { message: 'Title must be at least 1 character' })
  @MaxLength(200, { message: 'Title must not exceed 200 characters' })
  title: string;

  @ApiProperty({
    description: 'The content of the post in JSON format (EditorJS format)',
    example: {
      time: 1672531200000,
      blocks: [
        {
          id: 'block-1',
          type: 'header',
          data: { text: 'Introduction', level: 2 },
        },
        {
          id: 'block-2',
          type: 'paragraph',
          data: { text: 'This post will cover advanced NestJS topics.' },
        },
      ],
      version: '2.28.2',
    },
    required: true,
  })
  @IsNotEmpty({ message: 'Content is required' })
  content: any; // EditorJS content structure

  @ApiProperty({
    description: 'Short excerpt or summary of the post',
    example:
      'Learn advanced NestJS concepts including guards, interceptors, and more.',
    required: false,
    maxLength: 300,
  })
  @IsOptional()
  @IsString({ message: 'Excerpt must be a string' })
  @MaxLength(300, { message: 'Excerpt must not exceed 300 characters' })
  excerpt?: string;

  @ApiProperty({
    description: 'The IDs of the categories for the post',
    example: ['cm4abc123def', 'cm4xyz789ghi'],
    required: false,
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
    return [];
  })
  categoryIds?: string[];

  @ApiProperty({
    description: 'Array of tag names for the post',
    example: ['nestjs', 'typescript', 'backend'],
    required: false,
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
    return [];
  })
  tagNames?: string[];

  @ApiProperty({
    description: 'The name of a new series to create',
    example: 'Introduction to Node.js',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Series name must be a string' })
  @MaxLength(100, { message: 'Series name must not exceed 100 characters' })
  seriesname?: string;

  @ApiProperty({
    description: 'The ID of an existing series this post belongs to',
    example: 'cm4series123',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Series ID must be a string' })
  seriesId?: string;

  @ApiProperty({
    description: 'The status of the post',
    enum: PostStatus,
    example: PostStatus.DRAFT,
    required: false,
    default: PostStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(PostStatus, { message: 'Status must be a valid PostStatus value' })
  status?: PostStatus;

  @ApiProperty({
    description: 'Meta title for SEO',
    example: 'A Deep Dive into NestJS - Complete Guide',
    required: false,
    maxLength: 60,
  })
  @IsOptional()
  @IsString({ message: 'Meta title must be a string' })
  @MaxLength(60, {
    message: 'Meta title should not exceed 60 characters for SEO',
  })
  metaTitle?: string;

  @ApiProperty({
    description: 'Meta description for SEO',
    example:
      'Learn advanced NestJS concepts with practical examples and best practices.',
    required: false,
    maxLength: 160,
  })
  @IsOptional()
  @IsString({ message: 'Meta description must be a string' })
  @MaxLength(160, {
    message: 'Meta description should not exceed 160 characters for SEO',
  })
  metaDescription?: string;

  @ApiProperty({
    description:
      'Schedule the post to be published at a specific time (ISO string)',
    example: '2024-12-25T10:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Scheduled date must be a valid ISO date string' },
  )
  scheduledAt?: string;
}
