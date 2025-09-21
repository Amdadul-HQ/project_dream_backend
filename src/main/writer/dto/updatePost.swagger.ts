import { PostStatus } from '@prisma/client';

// Updated createPost swagger schema
export const createPostSwaggerSchema = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      example: 'A Deep Dive into NestJS',
      description: 'The title of the post',
      minLength: 1,
      maxLength: 200,
    },
    content: {
      type: 'object',
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
      description: 'The content of the post in EditorJS JSON format',
    },
    excerpt: {
      type: 'string',
      example:
        'Learn advanced NestJS concepts including guards, interceptors, and more.',
      description: 'Short excerpt or summary of the post',
      maxLength: 300,
    },
    categoryIds: {
      type: 'array',
      items: {
        type: 'string',
      },
      example: ['cm4abc123def', 'cm4xyz789ghi'],
      description: 'The IDs of the categories for the post',
    },
    tagNames: {
      type: 'array',
      items: {
        type: 'string',
      },
      example: ['nestjs', 'typescript', 'backend'],
      description: 'Array of tag names for the post',
    },
    seriesname: {
      type: 'string',
      example: 'Introduction to Node.js',
      description:
        'The name of a new series to create. Cannot be used with seriesId.',
      maxLength: 100,
    },
    seriesId: {
      type: 'string',
      example: 'cm4series123',
      description:
        'The ID of an existing series this post belongs to. Cannot be used with seriesname.',
    },
    status: {
      type: 'string',
      enum: Object.values(PostStatus),
      example: PostStatus.DRAFT,
      description: 'The status of the post',
    },
    metaTitle: {
      type: 'string',
      example: 'A Deep Dive into NestJS - Complete Guide',
      description: 'Meta title for SEO (recommended: under 60 characters)',
      maxLength: 60,
    },
    metaDescription: {
      type: 'string',
      example:
        'Learn advanced NestJS concepts with practical examples and best practices.',
      description:
        'Meta description for SEO (recommended: under 160 characters)',
      maxLength: 160,
    },
    scheduledAt: {
      type: 'string',
      format: 'date-time',
      example: '2024-12-25T10:00:00Z',
      description:
        'Schedule the post to be published at a specific time (ISO string)',
    },
    thumbnail: {
      type: 'string',
      format: 'binary',
      description: 'Thumbnail image file',
    },
    audio: {
      type: 'string',
      format: 'binary',
      description: 'Optional audio file',
    },
  },
  required: ['title', 'content'],
};

// updatePost swagger schema
export const updatePostSwaggerSchema = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      example: 'Updated: A Deep Dive into NestJS',
      description: 'The title of the post',
      minLength: 1,
      maxLength: 200,
    },
    content: {
      type: 'object',
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
      description: 'The content of the post in EditorJS JSON format',
    },
    excerpt: {
      type: 'string',
      example:
        'Updated: Learn advanced NestJS concepts including guards, interceptors, and more.',
      description: 'Short excerpt or summary of the post',
      maxLength: 300,
    },
    categoryIds: {
      type: 'array',
      items: {
        type: 'string',
      },
      example: ['cm4abc123def', 'cm4xyz789ghi'],
      description: 'The IDs of the categories for the post',
    },
    tagNames: {
      type: 'array',
      items: {
        type: 'string',
      },
      example: ['nestjs', 'typescript', 'backend', 'updated'],
      description: 'Array of tag names for the post',
    },
    seriesname: {
      type: 'string',
      example: 'Advanced Node.js Concepts',
      description:
        'The name of a new series to create and move this post to. Cannot be used with seriesId.',
      maxLength: 100,
    },
    seriesId: {
      type: 'string',
      example: 'cm4series123',
      description:
        'The ID of an existing series to move this post to. Use null to remove from series.',
    },
    status: {
      type: 'string',
      enum: Object.values(PostStatus),
      example: PostStatus.PUBLISHED,
      description: 'The status of the post',
    },
    metaTitle: {
      type: 'string',
      example: 'Updated: A Deep Dive into NestJS - Complete Guide',
      description: 'Meta title for SEO (recommended: under 60 characters)',
      maxLength: 60,
    },
    metaDescription: {
      type: 'string',
      example:
        'Updated guide covering advanced NestJS concepts with practical examples.',
      description:
        'Meta description for SEO (recommended: under 160 characters)',
      maxLength: 160,
    },
    scheduledAt: {
      type: 'string',
      format: 'date-time',
      example: '2024-12-25T10:00:00Z',
      description:
        'Schedule the post to be published at a specific time. Use null to remove scheduling.',
    },
    removeThumbnail: {
      type: 'boolean',
      example: false,
      description: 'Set to true to remove the current thumbnail',
      default: false,
    },
    removeAudio: {
      type: 'boolean',
      example: false,
      description: 'Set to true to remove the current audio',
      default: false,
    },
    thumbnail: {
      type: 'string',
      format: 'binary',
      description: 'New thumbnail image file (optional)',
    },
    audio: {
      type: 'string',
      format: 'binary',
      description: 'New audio file (optional)',
    },
  },
};

// Response schemas for better documentation
export const postResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'cm4post123' },
    title: { type: 'string', example: 'A Deep Dive into NestJS' },
    slug: { type: 'string', example: 'a-deep-dive-into-nestjs' },
    content: { type: 'object' },
    excerpt: { type: 'string' },
    thumbnail: { type: 'string', nullable: true },
    audioUrl: { type: 'string', nullable: true },
    authorId: { type: 'string' },
    seriesId: { type: 'string', nullable: true },
    seriesOrder: { type: 'number', nullable: true },
    status: { type: 'string', enum: Object.values(PostStatus) },
    publishedAt: { type: 'string', format: 'date-time', nullable: true },
    scheduledAt: { type: 'string', format: 'date-time', nullable: true },
    metaTitle: { type: 'string', nullable: true },
    metaDescription: { type: 'string', nullable: true },
    viewsCount: { type: 'number' },
    likeCount: { type: 'number' },
    commentCount: { type: 'number' },
    shareCount: { type: 'number' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    author: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        username: { type: 'string' },
        name: { type: 'string' },
        profile: { type: 'string', nullable: true },
        isVerified: { type: 'boolean' },
      },
    },
    series: {
      type: 'object',
      nullable: true,
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        slug: { type: 'string' },
      },
    },
    categories: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          slug: { type: 'string' },
          color: { type: 'string', nullable: true },
        },
      },
    },
    tags: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          slug: { type: 'string' },
        },
      },
    },
    stats: {
      type: 'object',
      properties: {
        likes: { type: 'number' },
        comments: { type: 'number' },
        saves: { type: 'number' },
        views: { type: 'number' },
      },
    },
  },
};

export const paginatedPostsResponseSchema = {
  type: 'object',
  properties: {
    data: {
      type: 'array',
      items: postResponseSchema,
    },
    pagination: {
      type: 'object',
      properties: {
        currentPage: { type: 'number' },
        totalPages: { type: 'number' },
        totalItems: { type: 'number' },
        itemsPerPage: { type: 'number' },
        hasNext: { type: 'boolean' },
        hasPrev: { type: 'boolean' },
      },
    },
  },
};
