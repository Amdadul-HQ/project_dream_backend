import {
  Body,
  Controller,
  Injectable,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
// import { UpdatePostDto } from './dto/update-post.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser, ValidateAuth } from 'src/common/jwt/jwt.decorator';
import { createPostSwaggerSchema } from './dto/create-post-swagger-schema';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from 'src/lib/cloudinary/cloudinary.service';
import { CreatePostService } from './services/post-create.service';

@ApiTags('Writer ---')
@Controller('writer/post')
@ApiBearerAuth()
@ValidateAuth()
@Injectable()
export class PostController {
  constructor(
    private readonly createPostService: CreatePostService,
    private readonly cloudinaryService: CloudinaryService,
    // private readonly updatePostService: UpdatePostService,
    // private readonly postsService: PostsService,
    // private readonly deleteService: DeletePostService,
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
    let audioUrl;

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
      const result = await this.cloudinaryService.uploadImageFromBuffer(
        files.audio[0].buffer,
        files.audio[0].originalname,
      );
      audioUrl = result.url;
    }

    return this.createPostService.createPost(
      dto,
      thumbnailUrl,
      audioUrl,
      userId,
    );
  }

  findAll() {
    return `This action returns all post`;
  }

  findOne(id: number) {
    return `This action returns a #${id} post`;
  }

  // update(id: number, updatePostDto: UpdatePostDto) {
  //   return `This action updates a #${id} post`;
  // }

  remove(id: number) {
    return `This action removes a #${id} post`;
  }
}
