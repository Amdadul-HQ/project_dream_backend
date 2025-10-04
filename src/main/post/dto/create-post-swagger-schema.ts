export const createPostSwaggerSchema = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      example: 'A Deep Dive into NestJS',
      description: 'The title of the post',
    },
    content: {
      type: 'string',
      example: JSON.stringify({
        blocks: [
          { type: 'header', data: { text: 'Introduction' } },
          {
            type: 'paragraph',
            data: { text: 'This post will cover advanced NestJS topics.' },
          },
        ],
      }),
      description: 'The content of the post as JSON string',
    },
    excerpt: {
      type: 'string',
      example: 'Learn advanced NestJS concepts',
      description: 'Short excerpt or summary',
    },
    categoryIds: {
      type: 'string',
      example:
        '09876543-210e-dcba-9876-543210fedcba,a1b2c3d4-e5f6-7890-1234-567890abcdef',
      description: 'Comma-separated category IDs',
    },
    tags: {
      type: 'string',
      example: 'nestjs,typescript,backend',
      description: 'Comma-separated tag names',
    },
    seriesname: {
      type: 'string',
      example: 'Introduction to Node.js',
      description: 'Name of new series',
    },
    seriesId: {
      type: 'string',
      example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
      description: 'ID of existing series',
    },
    seriesOrder: {
      type: 'integer',
      example: 1,
      description: 'Order in series',
    },
    status: {
      type: 'string',
      enum: [
        'DRAFT',
        'PUBLISHED',
        'ARCHIVED',
        'DELETED',
        'UNDER_REVIEW',
        'SCHEDULED',
      ],
      example: 'DRAFT',
      description: 'Post status',
    },
    metaTitle: {
      type: 'string',
      example: 'NestJS Deep Dive - Complete Guide',
      description: 'SEO meta title',
    },
    metaDescription: {
      type: 'string',
      example: 'Comprehensive guide to NestJS',
      description: 'SEO meta description',
    },
    scheduledAt: {
      type: 'string',
      example: '2024-12-31T10:00:00Z',
      description: 'Scheduled publish date',
    },
    thumbnail: {
      type: 'string',
      format: 'binary',
      description: 'Thumbnail image (required)',
    },
    audio: {
      type: 'string',
      format: 'binary',
      description: 'Optional audio file',
    },
  },
  required: ['title', 'content', 'categoryIds', 'status', 'thumbnail'],
};
