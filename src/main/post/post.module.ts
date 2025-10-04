import { Module } from '@nestjs/common';
import { CreatePostService } from './services/post-create.service';
import { CloudinaryService } from 'src/lib/cloudinary/cloudinary.service';
import { PostSeriesService } from './services/post-series.service';
import { PostSeriesController } from './controller/post-series.controller';
import { PostsPublicController } from './controller/post-get.controller';
import { PostController } from './controller/post-create.controller';
import { GetPostsService } from './services/post-get.service';

@Module({
  controllers: [PostController, PostSeriesController, PostsPublicController],
  providers: [
    CreatePostService,
    CloudinaryService,
    PostSeriesService,
    GetPostsService,
  ],
})
export class PostModule {}
