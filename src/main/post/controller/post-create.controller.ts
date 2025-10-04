import {
  Body,
  Controller,
  Injectable,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
// import { UpdatePostDto } from './dto/update-post.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser, ValidateAuth } from 'src/common/jwt/jwt.decorator';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from 'src/lib/cloudinary/cloudinary.service';
import { CreatePostService } from '../services/post-create.service';
import { createPostSwaggerSchema } from '../dto/create-post-swagger-schema';
import { CreatePostDto } from '../dto/create-post.dto';

@ApiTags('Writer ---')
@Controller('writer/post')
@ApiBearerAuth()
@ValidateAuth()
@Injectable()
export class PostController {
  constructor(
    private readonly createPostService: CreatePostService,
    private readonly cloudinaryService: CloudinaryService,
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
    console.log(dto, '---', files);
    let thumbnailUrl;
    let audioUrl;

    if (files.thumbnail?.[0]) {
      const result = await this.cloudinaryService.uploadImageFromBuffer(
        files.thumbnail[0].buffer,
        files.thumbnail[0].originalname,
      );
      thumbnailUrl = result.url;
    }

    if (files.audio?.[0]) {
      const result = await this.cloudinaryService.uploadAudioFromBuffer(
        files.audio[0].buffer,
        files.audio[0].originalname,
      );
      audioUrl = result.url;
    }
    console.log(audioUrl, thumbnailUrl, '---');
    return await this.createPostService.createPost(
      dto,
      thumbnailUrl,
      audioUrl,
      userId,
    );
  }
}
