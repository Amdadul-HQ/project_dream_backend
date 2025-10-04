import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { CreatePostService } from './services/post-create.service';
import { CloudinaryService } from 'src/lib/cloudinary/cloudinary.service';
import { PostSeriesService } from './services/post-series.service';

@Module({
  controllers: [PostController],
  providers: [CreatePostService, CloudinaryService, PostSeriesService],
})
export class PostModule {}
