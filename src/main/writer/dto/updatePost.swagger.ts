import { PostStatus } from '@prisma/client';

export const updatePostSwaggerSchema = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      example: 'An Updated Deep Dive into NestJS',
      description: 'The updated title of the post',
    },
    content: {
      type: 'object',
      example: {
        blocks: [
          { type: 'header', data: { text: 'New Introduction' } },
          {
            type: 'paragraph',
            data: { text: 'This is the revised content of the post.' },
          },
        ],
      },
      description: 'The updated content of the post in JSON format',
    },
    categoryIds: {
      type: 'array',
      items: {
        type: 'string',
        format: 'uuid',
      },
      example: ['a1b2c3d4-e5f6-7890-1234-567890abcdef'],
      description: 'The updated IDs of the categories for the post',
    },
    seriesname: {
      type: 'string',
      example: 'Updated Series: Introduction to Node.js',
      description: 'The updated unique name of the series',
    },
    seriesId: {
      type: 'string',
      format: 'uuid',
      example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
      description: 'The updated ID of the series this post belongs to',
    },
    status: {
      type: 'string',
      enum: Object.values(PostStatus),
      example: PostStatus.PUBLISHED,
      description: 'The updated status of the post',
    },
    thumbnail: {
      type: 'string',
      format: 'binary',
      description: 'The updated thumbnail image for the post',
    },
  },
  // All properties are optional for updates
  required: [],
};
