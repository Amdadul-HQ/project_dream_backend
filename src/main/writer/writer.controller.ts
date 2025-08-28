import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
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
import { GetUser, ValidateAuth } from '@project/common/jwt/jwt.decorator';
import { createPostSwaggerSchema } from './dto/createPost.swagger';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { CreatePostDto } from './dto/createPost.dto';
import { CloudinaryService } from '@project/lib/cloudinary/cloudinary.service';
import { CreatePostService } from './service/create-post.service';
import { UpdatePostService } from './service/update-post.service';
import { UpdatePostDto } from './dto/updatePost.dto';
import { updatePostSwaggerSchema } from './dto/updatePost.swagger';
import { AppError } from '@project/common/error/handle-error.app';
import { PostsService } from './service/getmypost.service';
import { DeletePostService } from './service/delete-post.service';
import { GetAllPostsDto } from './dto/getPost.dto';

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

  //create a post
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
      thumbnail: Express.Multer.File[];
      audio?: Express.Multer.File[];
    },
    @GetUser('userId') userId: string,
  ) {
    let thumbnailUrl;
    let audio;

    // Convert categoryIds string -> array if needed
    // if (dto.categoryIds && typeof dto.categoryIds === 'string') {
    //   dto.categoryIds = dto.categoryIds?.split(',').map((id) => id.trim());
    // }

    if (files.thumbnail?.[0]) {
      const result = await this.cloudinaryService.uploadImageFromBuffer(
        files.thumbnail[0].buffer,
        files.thumbnail[0].originalname,
      );
      thumbnailUrl = result.url;
    }

    if (files.audio?.[0]) {
      audio = files.audio?.[0];
    }

    return this.createPostService.createPost(dto, thumbnailUrl, audio, userId);
  }

  //Update a post
  @Patch(':postId')
  @ApiOperation({ summary: 'Updated a post' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Post update form data with image',
    schema: {
      type: 'object',
      properties: {
        ...updatePostSwaggerSchema.properties,
      },
    },
  })
  @UseInterceptors(FileInterceptor('thumbnail'))
  async updatePost(
    @Param('postId') postId: string,
    @Body() dto: UpdatePostDto,
    @UploadedFile() file: Express.Multer.File,
    @GetUser('userId') userId: string,
  ) {
    if (!userId) {
      throw new AppError(500, 'User id invalied!!!');
    }
    let uploadedUrl;
    if (file) {
      uploadedUrl = await this.cloudinaryService.uploadImageFromBuffer(
        file.buffer,
        file.originalname,
      );
    }
    return this.updatePostService.updatePost(
      postId,
      dto,
      uploadedUrl?.url || undefined,
      userId,
    );
  }

  //Writer all post
  @Get('my-posts')
  @ApiOperation({
    summary: 'Get all posts by a specific writer with filters and pagination',
  })
  async myPost(
    @GetUser('userId') writerId: string,
    @Query() query: GetAllPostsDto,
  ) {
    return this.postsService.getMyAllPosts(writerId, query);
  }

  //writer delet post
  @Delete(':postId')
  @ApiOperation({
    summary: 'Delete Post',
  })
  async deletePost(
    @Param('postId') postId: string,
    @GetUser('userId') writerId: string,
  ) {
    return await this.deleteService.deletePost(writerId, postId);
  }
}
