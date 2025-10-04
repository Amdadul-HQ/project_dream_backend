import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { CreatePostService } from './services/post-create.service';
import { CloudinaryService } from 'src/lib/cloudinary/cloudinary.service';

@Module({
  controllers: [PostController],
  providers: [CreatePostService, CloudinaryService],
})
export class PostModule {}
