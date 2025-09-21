import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { createPostSwaggerSchema } from './dto/createPost.swagger';
import { CreatePostDto } from './dto/createPost.dto';
import { CloudinaryService } from 'src/lib/cloudinary/cloudinary.service';
import { CreatePostService } from './service/create-post.service';
import { UpdatePostService } from './service/update-post.service';
import { UpdatePostDto } from './dto/updatePost.dto';
import { updatePostSwaggerSchema } from './dto/updatePost.swagger';
import { AppError } from 'src/common/error/handle-error.app';
import { PostsService } from './service/getmypost.service';
import { DeletePostService } from './service/delete-post.service';
import { GetAllPostsDto } from './dto/getPost.dto';
import { GetUser, ValidateAuth } from 'src/common/jwt/jwt.decorator';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

@ApiTags('Writer ---')
@Controller('writer/post')
@ApiBearerAuth()
@ValidateAuth()
export class WriterController {
  constructor(
    private readonly createPostService: CreatePostService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly updatePostService: UpdatePostService,
    private readonly postsService: PostsService,
    private readonly deleteService: DeletePostService,
  ) {}

  // Create a new post
  @Post()
  @ApiOperation({ summary: 'Create a new post' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Post creation form data with image and audio',
    schema: {
      type: 'object',
      properties: {
        ...createPostSwaggerSchema.properties,
        thumbnail: {
          type: 'string',
          format: 'binary',
        },
        audio: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'thumbnail', maxCount: 1 },
      { name: 'audio', maxCount: 1 },
    ]),
  )
  async createPost(
    @Body() dto: CreatePostDto,
    @UploadedFiles()
    files: {
      thumbnail?: Express.Multer.File[];
      audio?: Express.Multer.File[];
    },
    @GetUser('userId') userId: string,
  ) {
    let thumbnailUrl: string | undefined;
    let audioFile: Express.Multer.File | undefined;

    // Upload thumbnail if provided
    if (files.thumbnail?.[0]) {
      const result = await this.cloudinaryService.uploadImageFromBuffer(
        files.thumbnail[0].buffer,
        files.thumbnail[0].originalname,
      );
      thumbnailUrl = result.url;
    }

    // Get audio file if provided
    if (files.audio?.[0]) {
      audioFile = files.audio[0];
    }

    return this.createPostService.createPost(
      dto,
      thumbnailUrl,
      audioFile,
      userId,
    );
  }

  // Update a post
  @Patch(':postId')
  @ApiOperation({ summary: 'Update a post' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Post update form data with optional image and audio',
    schema: {
      type: 'object',
      properties: {
        ...updatePostSwaggerSchema.properties,
        thumbnail: {
          type: 'string',
          format: 'binary',
          description: 'Optional thumbnail image file',
        },
        audio: {
          type: 'string',
          format: 'binary',
          description: 'Optional audio file',
        },
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'thumbnail', maxCount: 1 },
      { name: 'audio', maxCount: 1 },
    ]),
  )
  async updatePost(
    @Param('postId') postId: string,
    @Body() dto: UpdatePostDto,
    @UploadedFiles()
    files: {
      thumbnail?: Express.Multer.File[];
      audio?: Express.Multer.File[];
    },
    @GetUser('userId') userId: string,
  ) {
    if (!userId) {
      throw new AppError(500, 'User id invalid!');
    }

    let thumbnailUrl: string | undefined;
    let audioFile: Express.Multer.File | undefined;

    // Upload thumbnail if provided
    if (files.thumbnail?.[0]) {
      const result = await this.cloudinaryService.uploadImageFromBuffer(
        files.thumbnail[0].buffer,
        files.thumbnail[0].originalname,
      );
      thumbnailUrl = result.url;
    }

    // Get audio file if provided
    if (files.audio?.[0]) {
      audioFile = files.audio[0];
    }

    return this.updatePostService.updatePost(
      postId,
      dto,
      thumbnailUrl,
      audioFile,
      userId,
    );
  }

  // Get writer's own posts
  @Get('my-posts')
  @ApiOperation({
    summary:
      'Get all posts by the authenticated writer with filters and pagination',
  })
  async myPosts(
    @GetUser('userId') writerId: string,
    @Query() query: GetAllPostsDto,
  ) {
    return this.postsService.getMyAllPosts(writerId, query);
  }

  // Get specific post by ID
  @Get(':postId')
  @ApiOperation({
    summary: 'Get a specific post by ID',
  })
  async getPostById(
    @Param('postId') postId: string,
    @GetUser('userId') writerId: string,
  ) {
    return this.postsService.getPostById(postId, writerId);
  }

  // Delete post
  @Delete(':postId')
  @ApiOperation({
    summary: 'Delete a post',
  })
  async deletePost(
    @Param('postId') postId: string,
    @GetUser('userId') writerId: string,
  ) {
    return this.deleteService.deletePost(writerId, postId);
  }

  // Get posts by series
  @Get('series/:seriesId')
  @ApiOperation({
    summary: 'Get all posts in a specific series',
  })
  async getPostsBySeries(
    @Param('seriesId') seriesId: string,
    @GetUser('userId') writerId: string,
    @Query() query: GetAllPostsDto,
  ) {
    return this.postsService.getPostsBySeries(seriesId, writerId, query);
  }

  // Publish/unpublish post
  @Patch(':postId/publish')
  @ApiOperation({
    summary: 'Publish or unpublish a post',
  })
  async togglePublishPost(
    @Param('postId') postId: string,
    @GetUser('userId') writerId: string,
    @Body() body: { status: 'PUBLISHED' | 'DRAFT' },
  ) {
    return this.updatePostService.updatePostStatus(
      postId,
      body.status,
      writerId,
    );
  }

  // Get writer statistics
  @Get('stats/overview')
  @ApiOperation({
    summary: 'Get writer statistics overview',
  })
  async getWriterStats(@GetUser('userId') writerId: string) {
    return this.postsService.getWriterStats(writerId);
  }
}
